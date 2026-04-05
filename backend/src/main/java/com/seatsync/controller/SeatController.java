package com.seatsync.controller;

import com.seatsync.model.Seat;
import com.seatsync.service.SeatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class SeatController {

    @Autowired
    private SeatService seatService;

    @GetMapping("/seats")
    public Seat[] getAllSeats() {
        return seatService.getAllSeats();
    }

    @PostMapping("/lock")
    public Map<String, Object> lockSeats(@RequestBody(required = false) Map<String, List<Integer>> body) {
        List<Integer> seatIds = getSeatIds(body);
        return seatService.lockSeats(seatIds);
    }

    @PostMapping("/book")
    public Map<String, Object> bookSeats(@RequestBody(required = false) Map<String, List<Integer>> body) {
        List<Integer> seatIds = getSeatIds(body);
        return seatService.bookSeats(seatIds);
    }

    @PostMapping("/cancel")
    public Map<String, Object> cancelSeats(@RequestBody(required = false) Map<String, List<Integer>> body) {
        List<Integer> seatIds = getSeatIds(body);
        return seatService.cancelSeats(seatIds);
    }

    @PostMapping("/reset")
    public Map<String, String> resetAll() {
        seatService.resetAll();
        Map<String, String> response = new HashMap<>();
        response.put("message", "All seats have been reset.");
        return response;
    }

    // segment tree query - how many free seats in range [l, r]
    @GetMapping("/availability")
    public Map<String, Object> getAvailability(@RequestParam(required = false) Integer l,
                                               @RequestParam(required = false) Integer r) {
        Map<String, Object> response = new HashMap<>();
        if (l == null || r == null) {
            response.put("error", "Please provide both l and r parameters.");
            return response;
        }
        int count = seatService.getAvailableCount(l, r);
        if (count == -1) {
            response.put("error", "Invalid range. l and r must be between 0 and 49, and l <= r.");
        } else {
            response.put("availableSeats", count);
            response.put("range", "Seats " + (l + 1) + " to " + (r + 1));
        }
        return response;
    }

    // avl tree query - next free seat after position 'from'
    @GetMapping("/next-available")
    public Map<String, Object> getNextAvailable(@RequestParam(defaultValue = "-1") int from) {
        int seatId = seatService.getNextAvailable(from);
        Map<String, Object> response = new HashMap<>();
        if (seatId == -1) {
            response.put("error", "No available seats found.");
        } else {
            response.put("seatId", seatId);
            response.put("displayNumber", seatId + 1);
        }
        return response;
    }

    // safely pull seatIds from request body, handles null body or missing key
    private List<Integer> getSeatIds(Map<String, List<Integer>> body) {
        if (body == null || !body.containsKey("seatIds")) {
            return new ArrayList<>();
        }
        return body.get("seatIds");
    }
}
