package com.example.jira.repository;

import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.example.jira.model.Sprint;

public interface SprintRepository extends MongoRepository<Sprint, ObjectId> {

    List<Sprint> findByProjectId(String projectId);
}
