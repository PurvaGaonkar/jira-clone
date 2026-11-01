package com.example.jira.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
@CrossOrigin(origins = "*")
@RestController
public class rootcontroller {
    @GetMapping("/")
    public String home(){
        return "Server is Running";
    }
    
}
