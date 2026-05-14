package com.agritrace.product.service;

import com.agritrace.common.exception.ResourceNotFoundException;
import com.agritrace.product.dto.CreateProductRequest;
import com.agritrace.product.dto.ProductResponse;
import com.agritrace.product.entity.Product;
import com.agritrace.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * ProductService - Phase 3.1
 * * Business logic for Product management
 * * Methods:
 * - createProduct() - ADMIN only (enforced at controller level)
 * - getAllProducts() - Public access
 * - getProductById() - Public access
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;

    /**
     * Create a new product
     * * Authorization: ADMIN only (enforced by @PreAuthorize at controller)
     * * @param request Product creation request
     * @return ProductResponse
     */
    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        log.info("Creating new product: {}", request.getName());

        // Build product entity
        Product product = Product.builder()
                .name(request.getName())
                .description(request.getDescription())
                .build();

        // Save (createdAt and updatedAt auto-populated by JPA Auditing)
        Product savedProduct = productRepository.save(product);

        log.info("Product created successfully with ID: {}", savedProduct.getId());

        return mapToResponse(savedProduct);
    }

    /**
     * Get all products
     * * Authorization: Public (anyone can view products)
     * * @return List of all products
     */
    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts() {
        log.debug("Fetching all products");

        List<Product> products = productRepository.findAll();

        return products.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Offset pagination for product master data.
     */
    @Transactional(readOnly = true)
    public Page<ProductResponse> getProductsPage(String keyword, Pageable pageable) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim();
        return productRepository.findByNameContainingIgnoreCase(normalizedKeyword, pageable)
                .map(this::mapToResponse);
    }

    /**
     * Get product by ID
     * * Authorization: Public
     * * @param id Product ID
     * @return ProductResponse
     */
    @Transactional(readOnly = true)
    public ProductResponse getProductById(UUID id) {
        log.debug("Fetching product with ID: {}", id);

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        return mapToResponse(product);
    }

    /**
     * Map Product entity to ProductResponse DTO
     */
    private ProductResponse mapToResponse(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}
