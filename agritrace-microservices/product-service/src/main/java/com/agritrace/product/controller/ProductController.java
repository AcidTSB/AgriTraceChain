package com.agritrace.product.controller;

import com.agritrace.common.dto.ApiResponse;
import com.agritrace.product.dto.CreateProductRequest;
import com.agritrace.product.dto.ProductResponse;
import com.agritrace.product.dto.UpdateProductRequest;
import com.agritrace.product.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * ProductController - Phase 3.1
 * 
 * REST API for Product management
 * 
 * Base path: /api/v1/products
 * 
 * Endpoints:
 * - POST /api/v1/products - Create product (ADMIN only)
 * - GET /api/v1/products - Get all products (Public)
 * - PUT /api/v1/products/{id} - Update product (ADMIN only)
 * - DELETE /api/v1/products/{id} - Delete product (ADMIN only)
 * - GET /api/v1/products/{id} - Get product by ID (Public)
 * 
 * Authorization:
 * - POST: ADMIN only (product catalog management)
 * - GET: Public (anyone can view products)
 */
@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@Slf4j
public class ProductController {

    private static final int MAX_PAGE_SIZE = 50;

    private final ProductService productService;

    /**
     * Create a new product
     * 
     * Authorization: ADMIN only
     * 
     * @param request Product creation data
     * @return ApiResponse with created product
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
                        @Valid @RequestBody CreateProductRequest request,
                        @RequestHeader(value = "X-User-Role", required = false) String role,
                        @RequestHeader(value = "X-Gateway-Token", required = false) String gatewayToken) {

                if (!"agritrace-gateway-trusted-token".equals(gatewayToken) || !hasRole(role, "ADMIN")) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only ADMIN can create products");
                }
        
        log.info("POST /api/v1/products - Create product request: {}", request.getName());

        ProductResponse response = productService.createProduct(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        HttpStatus.CREATED.value(),
                        "Product created successfully",
                        response
                ));
    }

    /**
     * Get all products
     * 
     * Authorization: Public (no authentication required)
     * 
     * @return ApiResponse with list of all products
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getAllProducts() {
        log.info("GET /api/v1/products - Get all products");

        List<ProductResponse> response = productService.getAllProducts();

        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK.value(),
                        "Products retrieved successfully",
                        response
                )
        );
    }

    /**
     * Master-data pagination endpoint with strict hard limit (size <= 50).
     */
    @GetMapping("/page")
    public ResponseEntity<ApiResponse<Page<ProductResponse>>> getProductsPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "updatedAt,desc") String sort,
            @RequestParam(defaultValue = "") String q) {
        Pageable pageable = buildPageable(page, size, sort);
        Page<ProductResponse> response = productService.getProductsPage(q, pageable);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK.value(), "Products page retrieved", response));
    }

    /**
     * Get product by ID
     * 
     * Authorization: Public (no authentication required)
     * 
     * @param id Product ID
     * @return ApiResponse with product details
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductById(@PathVariable UUID id) {
        log.info("GET /api/v1/products/{} - Get product by ID", id);

        ProductResponse response = productService.getProductById(id);

        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK.value(),
                        "Product retrieved successfully",
                        response
                )
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> updateProduct(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateProductRequest request,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-Gateway-Token", required = false) String gatewayToken) {

        if (!"agritrace-gateway-trusted-token".equals(gatewayToken) || !hasRole(role, "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only ADMIN can update products");
        }

        ProductResponse response = productService.updateProduct(id, request);

        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK.value(),
                        "Product updated successfully",
                        response
                )
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-Gateway-Token", required = false) String gatewayToken) {

        if (!"agritrace-gateway-trusted-token".equals(gatewayToken) || !hasRole(role, "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only ADMIN can delete products");
        }

        productService.deleteProduct(id);
        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK.value(),
                        "Product deleted successfully",
                        null
                )
        );
    }

    private boolean hasRole(String roleHeader, String expectedRole) {
                if (roleHeader == null || roleHeader.isBlank()) {
                        return false;
                }

                String normalized = roleHeader.trim().toUpperCase();
                if (normalized.startsWith("ROLE_")) {
                        normalized = normalized.substring("ROLE_".length());
                }
        return expectedRole.equals(normalized);
    }

    private Pageable buildPageable(int page, int size, String sort) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Sort safeSort = parseSort(sort);
        return PageRequest.of(safePage, safeSize, safeSort);
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, "updatedAt");
        }
        String[] parts = sort.split(",", 2);
        String field = parts[0].isBlank() ? "updatedAt" : parts[0];
        Sort.Direction direction = (parts.length > 1 && "asc".equalsIgnoreCase(parts[1]))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        return Sort.by(direction, field);
    }
}
