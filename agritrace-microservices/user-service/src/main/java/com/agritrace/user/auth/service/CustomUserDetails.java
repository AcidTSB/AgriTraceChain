package com.agritrace.auth.service;

import com.agritrace.user.entity.User;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * CustomUserDetails - Phase 2.3
 * 
 * Wrapper class for User entity implementing Spring Security UserDetails
 * 
 * Purpose:
 * - Bridge between User entity and Spring Security
 * - Provide authentication and authorization information
 * - No need to modify User entity to implement UserDetails
 * 
 * Benefits:
 * - Clean separation of concerns
 * - User entity remains domain-focused
 * - Security logic encapsulated here
 */
@RequiredArgsConstructor
public class CustomUserDetails implements UserDetails {

    @Getter
    private final User user;

    /**
     * Get username for authentication
     * Maps to User.username field
     */
    @Override
    public String getUsername() {
        return user.getUsername();
    }

    /**
     * Get password hash for authentication
     * Maps to User.passwordHash field
     */
    @Override
    public String getPassword() {
        return user.getPassword();
    }

    /**
     * Get user authorities (roles)
     * 
     * Maps UserRole enum to Spring Security GrantedAuthority
     * Format: "ROLE_{role_name}"
     * 
     * Example:
     * - UserRole.ADMIN → "ROLE_ADMIN"
     * - UserRole.FARMER → "ROLE_FARMER"
     * - UserRole.INSPECTOR → "ROLE_INSPECTOR"
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    /**
     * Account non-expired check
     * 
     * Currently always returns true
     * Future: Can implement account expiration logic
     */
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    /**
     * Account non-locked check
     * 
     * Currently always returns true
     * Future: Can implement account locking after failed attempts
     */
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    /**
     * Credentials non-expired check
     * 
     * Currently always returns true
     * Future: Can implement password expiration policy
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    /**
     * Account enabled check
     * 
     * Currently always returns true
     * Future: Can add 'enabled' field to User entity
     */
    @Override
    public boolean isEnabled() {
        return true;
    }
}
