package com.agritrace.auth.service;

import com.agritrace.auth.service.CustomUserDetails;
import com.agritrace.user.entity.User;
import com.agritrace.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * CustomUserDetailsService - Phase 2.3
 * 
 * Implementation of Spring Security UserDetailsService
 * Loads user from database and wraps in CustomUserDetails
 * 
 * Purpose:
 * - Load user by username during authentication
 * - Bridge between Spring Security and application's User entity
 * - Used by AuthenticationProvider for user lookup
 * 
 * Flow:
 * 1. Spring Security calls loadUserByUsername(username)
 * 2. Query database for user
 * 3. Wrap User entity in CustomUserDetails
 * 4. Return UserDetails to Spring Security
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Load user by username
     * 
     * Called by Spring Security during authentication process
     * 
     * @param username Username to search for
     * @return UserDetails containing user information and authorities
     * @throws UsernameNotFoundException if user not found
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        log.debug("Loading user by username: {}", username);
        
        // Find user in database by username or email
        User user = userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> {
                    log.warn("User not found: {}", username);
                    return new UsernameNotFoundException("User not found: " + username);
                });
        
        log.debug("User found: {} with role: {}", username, user.getRole());
        
        // Wrap in CustomUserDetails
        return new CustomUserDetails(user);
    }
}
