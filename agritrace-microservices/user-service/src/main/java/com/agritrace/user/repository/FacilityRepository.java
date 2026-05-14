package com.agritrace.user.repository;

import com.agritrace.user.entity.Facility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface FacilityRepository extends JpaRepository<Facility, UUID> {
    java.util.List<Facility> findByOwnerId(java.util.UUID ownerId);
    Page<Facility> findByNameContainingIgnoreCaseOrAddressContainingIgnoreCase(
            String nameKeyword,
            String addressKeyword,
            Pageable pageable
    );
}
