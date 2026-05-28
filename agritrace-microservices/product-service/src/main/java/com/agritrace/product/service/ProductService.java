package com.agritrace.product.service;

import com.agritrace.common.exception.ResourceNotFoundException;
import com.agritrace.product.config.CacheConfig;
import com.agritrace.product.dto.CreateProductRequest;
import com.agritrace.product.dto.ProductResponse;
import com.agritrace.product.dto.UpdateProductRequest;
import com.agritrace.product.entity.Product;
import com.agritrace.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
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
     *
     * Cache: Evicts 'all' list cache on creation so subsequent list calls
     * reflect the new product. Specific product cache will be populated on first read.
     */
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = CacheConfig.CACHE_BATCH_LIST, allEntries = true)
    })
    public ProductResponse createProduct(CreateProductRequest request) {
        log.info("Creating new product: {}", request.getName());

        Product product = Product.builder()
                .name(request.getName().trim())
                .description(normalizeNullableText(request.getDescription()))
                .sku(normalizeNullableText(request.getSku()))
                .category(normalizeNullableText(request.getCategory()))
                .isActive(request.getIsActive() == null ? true : request.getIsActive())
                .build();

        Product savedProduct = productRepository.save(product);

        log.info("Product created successfully with ID: {}, SKU: {}, Category: {}",
                savedProduct.getId(), savedProduct.getSku(), savedProduct.getCategory());

        return mapToResponse(savedProduct);
    }

    /**
     * Update product – evicts specific product cache and list cache.
     */
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = CacheConfig.CACHE_PRODUCT_DETAIL, key = "#id"),
        @CacheEvict(value = CacheConfig.CACHE_BATCH_LIST, allEntries = true)
    })
    public ProductResponse updateProduct(UUID id, UpdateProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        boolean activationOnly = request.getIsActive() != null
                && request.getName() == null
                && request.getDescription() == null
                && request.getSku() == null
                && request.getCategory() == null;

        if (!activationOnly) {
            if (request.getName() == null) {
                throw new IllegalArgumentException("Product name is required for catalog updates");
            }
            String normalizedName = request.getName().trim();
            if (normalizedName.isBlank()) {
                throw new IllegalArgumentException("Product name cannot be blank");
            }
            product.setName(normalizedName);
            product.setDescription(normalizeNullableText(request.getDescription()));
            product.setSku(normalizeNullableText(request.getSku()));
            product.setCategory(normalizeNullableText(request.getCategory()));
        }

        if (request.getIsActive() != null) {
            product.setIsActive(request.getIsActive());
        }

        Product saved = productRepository.save(product);
        return mapToResponse(saved);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(value = CacheConfig.CACHE_PRODUCT_DETAIL, key = "#id"),
        @CacheEvict(value = CacheConfig.CACHE_BATCH_LIST, allEntries = true)
    })
    public void deleteProduct(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        productRepository.delete(product);
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
     * Get product by ID – cached by product ID.
     *
     * <p>Cache key: 'product-detail::&lt;uuid&gt;'</p>
     * <p>TTL: 1 hour (stable product master data)</p>
     */
    @Transactional(readOnly = true)
    @Cacheable(value = CacheConfig.CACHE_PRODUCT_DETAIL, key = "#id")
    public ProductResponse getProductById(UUID id) {
        log.debug("Fetching product from DB (cache miss): {}", id);

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
                .sku(product.getSku())
                .category(product.getCategory())
                .isActive(product.getIsActive())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }

    private String normalizeNullableText(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
