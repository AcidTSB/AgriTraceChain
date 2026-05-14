package com.agritrace.product.repository;

import com.agritrace.product.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * ProductRepository - Phase 3.1
 * 
 * Repository for Product entity
 * 
 * Methods:
 * - findAll() - Get all products (inherited from JpaRepository)
 * - findById() - Get product by ID (inherited)
 * - save() - Save product (inherited)
 */
@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {
    // JpaRepository already provides:
    // - List<Product> findAll()
    // - Optional<Product> findById(UUID id)
    // - Product save(Product product)
    // - void deleteById(UUID id)
    Page<Product> findByNameContainingIgnoreCase(String keyword, Pageable pageable);
}
