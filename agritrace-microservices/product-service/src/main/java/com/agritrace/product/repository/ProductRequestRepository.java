package com.agritrace.product.repository;

import com.agritrace.product.entity.ProductRequest;
import com.agritrace.product.entity.ProductRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * ProductRequestRepository
 *
 * Queries for the product_requests table.
 */
@Repository
public interface ProductRequestRepository extends JpaRepository<ProductRequest, UUID> {

    /** Farmer: get own requests ordered by latest first */
    Page<ProductRequest> findByFarmerIdOrderByCreatedAtDesc(UUID farmerId, Pageable pageable);

    /** Admin: filter all requests by status */
    Page<ProductRequest> findByStatusOrderByCreatedAtDesc(ProductRequestStatus status, Pageable pageable);

    /**
     * Duplicate detection: find requests with a similar product name
     * that are not in a given status (e.g. not REJECTED so we don't flag dead requests).
     */
    List<ProductRequest> findByProductNameContainingIgnoreCaseAndStatusNot(
            String name, ProductRequestStatus excludedStatus);
}
