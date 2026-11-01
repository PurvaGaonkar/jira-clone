package com.example.jira.controller;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*")
@RestController
public class Healthcontoller {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Value("${spring.data.mongodb.uri}")
    private String mongoUri;

    @GetMapping("/health")
    public String healthcheck() {
        try {
            // ❌ OS env (may be null, that's OK)
            System.out.println("ENV SPRING_DATA_MONGODB_URI = [" +
                    System.getenv("SPRING_DATA_MONGODB_URI") + "]");

            // ✅ Spring config (this is what MongoTemplate actually uses)
            System.out.println("SPRING mongo uri = [" + mongoUri + "]");

            mongoTemplate.getDb().runCommand(new Document("ping", 1));
            return "MongoDB connected Successfully";
        } catch (Exception e) {
            return "MongoDB connected failed: " + e.getMessage();
        }
    }
}
