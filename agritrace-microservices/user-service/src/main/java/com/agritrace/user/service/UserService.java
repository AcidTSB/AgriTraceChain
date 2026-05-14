package com.agritrace.user.service;

import java.util.UUID;

import com.agritrace.user.dto.CreateUserRequest;
import com.agritrace.user.dto.UpdateProfileRequest;
import com.agritrace.user.dto.UserResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * User Service Interface
 * Business logic for user management
 */
public interface UserService {

    /**
     * Create a new user
     *
     * @param request user creation data
     * @return created user response
     */
    UserResponse createUser(CreateUserRequest request);

    /**
     * Get user by ID
     *
     * @param id user ID
     * @return user response
     * @throws com.agritrace.common.exception.ResourceNotFoundException if user not found
     */
    UserResponse getUserById(UUID id);

    /**
     * Get current user profile by user id from gateway headers.
     *
     * @param userId current user id
     * @return current user profile
     */
    UserResponse getCurrentUser(UUID userId);

    /**
     * Update current user profile by user id from gateway headers.
     *
     * @param userId current user id
     * @param request profile update payload
     * @return updated user profile
     */
    UserResponse updateCurrentUser(UUID userId, UpdateProfileRequest request);

    /**
     * Search users with offset pagination.
     *
     * @param keyword search keyword (username/email/fullName)
     * @param pageable offset pagination/sort
     * @return paged users
     */
    Page<UserResponse> getUsersPage(String keyword, Pageable pageable);

    /**
     * Return total number of users
     *
     * @return total user count
     */
    long countUsers();

}
