package com.agritrace.user.service.impl;

import com.agritrace.common.exception.ResourceNotFoundException;
import com.agritrace.user.dto.CreateUserRequest;
import com.agritrace.user.dto.UpdateProfileRequest;
import com.agritrace.user.dto.UserResponse;
import com.agritrace.user.entity.User;
import com.agritrace.user.repository.UserRepository;
import com.agritrace.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * User Service Implementation
 * Handles user-related business logic
 */
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists: " + request.getEmail());
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .fullName(request.getFullName())
                .role(request.getRole())
                .publicKey(request.getPublicKey())
                .walletAddress(request.getWalletAddress())
                .build();

        User savedUser = userRepository.save(user);
        return mapToResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return mapToResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        return mapToResponse(user);
    }

    @Override
    public UserResponse updateCurrentUser(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getEmail() != null) {
            String normalizedEmail = request.getEmail().trim();
            if (normalizedEmail.isBlank()) {
                throw new IllegalArgumentException("Email must not be blank");
            }
            boolean emailChanged = user.getEmail() == null
                    || !user.getEmail().equalsIgnoreCase(normalizedEmail);
            if (emailChanged && userRepository.existsByEmail(normalizedEmail)) {
                throw new IllegalArgumentException("Email already exists: " + normalizedEmail);
            }
            user.setEmail(normalizedEmail);
        }

        User savedUser = userRepository.save(user);
        return mapToResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserResponse> getUsersPage(String keyword, Pageable pageable) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim();
        return userRepository
                .findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(
                        normalizedKeyword,
                        normalizedKeyword,
                        normalizedKeyword,
                        pageable
                )
                .map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public long countUsers() {
        return userRepository.count();
    }

    private UserResponse mapToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .branch(user.getFacility() != null ? user.getFacility().getName() : null)
                .publicKey(user.getPublicKey())
                .walletAddress(user.getWalletAddress())
                
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
