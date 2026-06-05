package com.agritrace.product.entity;

/**
 * ProductRequestStatus
 *
 * Lifecycle: PENDING → APPROVED or REJECTED (terminal states, no reversal)
 */
public enum ProductRequestStatus {
    /** Waiting for Admin review */
    PENDING,
    /** Admin approved — Product created in catalog */
    APPROVED,
    /** Admin rejected — rejectionReason is populated */
    REJECTED
}
