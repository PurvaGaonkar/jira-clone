package com.example.jira.service;

import com.example.jira.model.User;
import com.example.jira.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User authenticate(String token) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Authentication required");
        }

        User user = userRepository.findBySessionToken(token)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Invalid session"));

        if (!user.isActive()) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN, "Account is deactivated");
        }

        return user;
    }
}