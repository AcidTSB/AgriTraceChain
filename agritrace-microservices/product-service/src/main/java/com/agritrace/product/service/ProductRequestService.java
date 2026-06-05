package com.agritrace.product.service;

import com.agritrace.common.exception.ResourceNotFoundException;
import com.agritrace.product.dto.CreateProductRequestDto;
import com.agritrace.product.dto.ProductRequestResponse;
import com.agritrace.product.dto.ReviewProductRequestDto;
import com.agritrace.product.entity.Product;
import com.agritrace.product.entity.ProductRequest;
import com.agritrace.product.entity.ProductRequestStatus;
import com.agritrace.product.repository.ProductRepository;
import com.agritrace.product.repository.ProductRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * ProductRequestService
 *
 * Business logic for the Product Creation Request workflow:
 *   1. FARMER submits a request (submitRequest)
 *   2. ADMIN reviews it (reviewRequest → approve or reject)
 *   3. On approve: Product is created, Kafka event is published
 *   4. On reject:  Kafka event is published with reason
 *
 * Idempotency: Only PENDING requests can be approved/rejected.
 * Duplicate detection: SQL LIKE search on existing products at query-time.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductRequestService {

    private static final String TOPIC = "product-request-topic";

    private final ProductRequestRepository requestRepository;
    private final ProductRepository productRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // ─────────────────────────────────────────────────────────────────────────
    // FARMER actions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Submit a new product creation request.
     * Any FARMER can call this. Returns the created request (status = PENDING).
     */
    @Transactional
    public ProductRequestResponse submitRequest(UUID farmerId, CreateProductRequestDto dto) {
        log.info("Farmer {} submitting product request: '{}'", farmerId, dto.getProductName());

        ProductRequest req = ProductRequest.builder()
                .farmerId(farmerId)
                .productName(dto.getProductName().trim())
                .category(normalizeNullable(dto.getCategory()))
                .description(normalizeNullable(dto.getDescription()))
                .unit(normalizeNullable(dto.getUnit()))
                .imageUrl(normalizeNullable(dto.getImageUrl()))
                .note(normalizeNullable(dto.getNote()))
                .status(ProductRequestStatus.PENDING)
                .build();

        ProductRequest saved = requestRepository.save(req);
        log.info("Product request saved with id={}", saved.getId());
        // Don't compute similarProducts for farmer's own view
        return mapToResponse(saved, null);
    }

    /**
     * Farmer: get own requests (paginated).
     */
    @Transactional(readOnly = true)
    public Page<ProductRequestResponse> getMyRequests(UUID farmerId, Pageable pageable) {
        return requestRepository.findByFarmerIdOrderByCreatedAtDesc(farmerId, pageable)
                .map(req -> mapToResponse(req, null));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN actions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Admin: get all requests, optionally filtered by status.
     * Similar products are computed and included in each response.
     */
    @Transactional(readOnly = true)
    public Page<ProductRequestResponse> getAllRequests(String statusFilter, Pageable pageable) {
        Page<ProductRequest> page;
        if (statusFilter != null && !statusFilter.isBlank() && !statusFilter.equalsIgnoreCase("ALL")) {
            try {
                ProductRequestStatus status = ProductRequestStatus.valueOf(statusFilter.toUpperCase());
                page = requestRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
            } catch (IllegalArgumentException e) {
                page = requestRepository.findAll(pageable);
            }
        } else {
            page = requestRepository.findAll(pageable);
        }

        return page.map(req -> mapToResponse(req, findSimilarProducts(req.getProductName())));
    }

    /**
     * Admin: review a request.
     * Idempotent guard: only PENDING requests can be reviewed.
     *
     * @param requestId target request
     * @param adminId   UUID of admin performing the action
     * @param dto       action (APPROVE|REJECT) + optional rejectionReason
     */
    @Transactional
    public ProductRequestResponse reviewRequest(UUID requestId, UUID adminId, ReviewProductRequestDto dto) {
        ProductRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("ProductRequest", "id", requestId));

        // Idempotency guard
        if (req.getStatus() != ProductRequestStatus.PENDING) {
            throw new IllegalStateException(
                    "Yêu cầu đã được xử lý (trạng thái: " + req.getStatus() + "). Không thể thay đổi.");
        }

        String action = dto.getAction() == null ? "" : dto.getAction().trim().toUpperCase();

        switch (action) {
            case "APPROVE" -> handleApprove(req, adminId);
            case "REJECT"  -> handleReject(req, adminId, dto.getRejectionReason());
            default -> throw new IllegalArgumentException("action phải là APPROVE hoặc REJECT");
        }

        ProductRequest saved = requestRepository.save(req);
        log.info("Product request {} {} by admin {}", requestId, action, adminId);
        return mapToResponse(saved, null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private void handleApprove(ProductRequest req, UUID adminId) {
        // Create the official Product directly via repository to avoid circular dependency with ProductService
        Product product = Product.builder()
                .name(req.getProductName())
                .description(req.getDescription())
                .category(req.getCategory())
                .unit(req.getUnit())
                .imageUrl(req.getImageUrl())
                .isActive(true)
                .build();
        productRepository.save(product);
        log.info("Product created from request: '{}', id={}", product.getName(), product.getId());

        req.setStatus(ProductRequestStatus.APPROVED);
        req.setReviewedByAdminId(adminId);

        // Publish Kafka event
        Map<String, Object> event = buildKafkaEvent(
                "PRODUCT_REQUEST_APPROVED", req, adminId, null);
        kafkaTemplate.send(TOPIC, req.getId().toString(), event);
        log.info("Published PRODUCT_REQUEST_APPROVED for requestId={}, farmerId={}", req.getId(), req.getFarmerId());
    }

    private void handleReject(ProductRequest req, UUID adminId, String reason) {
        String normalizedReason = normalizeNullable(reason);

        req.setStatus(ProductRequestStatus.REJECTED);
        req.setReviewedByAdminId(adminId);
        req.setRejectionReason(normalizedReason);

        // Publish Kafka event
        Map<String, Object> event = buildKafkaEvent(
                "PRODUCT_REQUEST_REJECTED", req, adminId, normalizedReason);
        kafkaTemplate.send(TOPIC, req.getId().toString(), event);
        log.info("Published PRODUCT_REQUEST_REJECTED for requestId={}, farmerId={}", req.getId(), req.getFarmerId());
    }

    private Map<String, Object> buildKafkaEvent(String operation, ProductRequest req,
                                                 UUID adminId, String rejectionReason) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("operation", operation);
        event.put("requestId", req.getId().toString());
        event.put("receiverUserId", req.getFarmerId().toString());
        event.put("productName", req.getProductName());
        event.put("reviewedByAdminId", adminId.toString());
        if (rejectionReason != null) {
            event.put("rejectionReason", rejectionReason);
        }
        return event;
    }

    /**
     * Find existing products whose name contains any token from the request name.
     * Token search: split name by whitespace, search each token.
     * Returns up to 5 matches.
     */
    private List<ProductRequestResponse.SimilarProductDto> findSimilarProducts(String productName) {
        if (productName == null || productName.isBlank()) {
            return Collections.emptyList();
        }

        String[] tokens = productName.trim().split("\\s+");
        Set<UUID> seen = new LinkedHashSet<>();
        List<ProductRequestResponse.SimilarProductDto> results = new ArrayList<>();

        for (String token : tokens) {
            if (token.length() < 2) continue; // skip very short tokens
            List<Product> matches = productRepository.findByNameContainingIgnoreCase(token,
                    org.springframework.data.domain.PageRequest.of(0, 10)).getContent();
            for (Product p : matches) {
                if (seen.add(p.getId()) && results.size() < 5) {
                    results.add(ProductRequestResponse.SimilarProductDto.builder()
                            .id(p.getId())
                            .name(p.getName())
                            .category(p.getCategory())
                            .sku(p.getSku())
                            .build());
                }
            }
        }
        return results;
    }

    private ProductRequestResponse mapToResponse(ProductRequest req,
                                                  List<ProductRequestResponse.SimilarProductDto> similar) {
        return ProductRequestResponse.builder()
                .id(req.getId())
                .farmerId(req.getFarmerId())
                .productName(req.getProductName())
                .category(req.getCategory())
                .description(req.getDescription())
                .unit(req.getUnit())
                .imageUrl(req.getImageUrl())
                .note(req.getNote())
                .status(req.getStatus())
                .rejectionReason(req.getRejectionReason())
                .reviewedByAdminId(req.getReviewedByAdminId())
                .createdAt(req.getCreatedAt())
                .updatedAt(req.getUpdatedAt())
                .similarProducts(similar)
                .build();
    }

    private String normalizeNullable(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }
}
