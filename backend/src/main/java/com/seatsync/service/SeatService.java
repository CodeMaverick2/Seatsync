package com.seatsync.service;

import com.seatsync.model.Seat;
import com.seatsync.tree.AVLTree;
import com.seatsync.tree.SegmentTree;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SeatService {

    private static final int TOTAL_SEATS = 50;

    private Seat[] seats;
    private SegmentTree segmentTree;
    private AVLTree avlTree;

    public SeatService() {
        seats = new Seat[TOTAL_SEATS];
        for (int i = 0; i < TOTAL_SEATS; i++) {
            seats[i] = new Seat(i);
        }

        // segment tree tracks how many seats are free in any range
        segmentTree = new SegmentTree(TOTAL_SEATS);

        // avl tree stores the IDs of all currently free seats
        avlTree = new AVLTree();
        for (int i = 0; i < TOTAL_SEATS; i++) {
            avlTree.insert(i);
        }
    }

    public Seat[] getAllSeats() {
        return seats;
    }

    // tries to lock each seat, returns which ones worked and which ones failed
    public Map<String, Object> lockSeats(List<Integer> seatIds) {
        List<Integer> locked = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        if (seatIds == null || seatIds.isEmpty()) {
            errors.add("No seat IDs provided.");
            return buildResult(locked, errors);
        }

        for (int id : seatIds) {
            if (id < 0 || id >= TOTAL_SEATS) {
                errors.add("Seat ID " + id + " is invalid. Valid range is 0 to " + (TOTAL_SEATS - 1) + ".");
                continue;
            }
            Seat seat = seats[id];
            if (seat.isBooked()) {
                errors.add("Seat " + (id + 1) + " is already booked.");
            } else if (seat.isLocked()) {
                errors.add("Seat " + (id + 1) + " is already locked.");
            } else {
                seat.setLocked(true);
                segmentTree.update(id, false);
                avlTree.delete(id);
                locked.add(id + 1);
            }
        }

        return buildResult(locked, errors);
    }

    // tries to book each seat, seat must be locked first
    public Map<String, Object> bookSeats(List<Integer> seatIds) {
        List<Integer> booked = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        if (seatIds == null || seatIds.isEmpty()) {
            errors.add("No seat IDs provided.");
            return buildResult(booked, errors);
        }

        for (int id : seatIds) {
            if (id < 0 || id >= TOTAL_SEATS) {
                errors.add("Seat ID " + id + " is invalid. Valid range is 0 to " + (TOTAL_SEATS - 1) + ".");
                continue;
            }
            Seat seat = seats[id];
            if (seat.isBooked()) {
                errors.add("Seat " + (id + 1) + " is already booked.");
            } else if (!seat.isLocked()) {
                errors.add("Seat " + (id + 1) + " was not locked. Lock it first.");
            } else {
                seat.setLocked(false);
                seat.setBooked(true);
                booked.add(id + 1);
            }
        }

        return buildResult(booked, errors);
    }

    // cancel a booked seat - makes it available again
    public Map<String, Object> cancelSeats(List<Integer> seatIds) {
        List<Integer> cancelled = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        if (seatIds == null || seatIds.isEmpty()) {
            errors.add("No seat IDs provided.");
            return buildResult(cancelled, errors);
        }

        for (int id : seatIds) {
            if (id < 0 || id >= TOTAL_SEATS) {
                errors.add("Seat ID " + id + " is invalid. Valid range is 0 to " + (TOTAL_SEATS - 1) + ".");
                continue;
            }
            Seat seat = seats[id];
            if (!seat.isBooked()) {
                errors.add("Seat " + (id + 1) + " is not booked. Nothing to cancel.");
            } else {
                seat.setBooked(false);
                segmentTree.update(id, true);
                avlTree.insert(id);
                cancelled.add(id + 1);
            }
        }

        return buildResult(cancelled, errors);
    }

    // reset all seats back to available
    public void resetAll() {
        for (int i = 0; i < TOTAL_SEATS; i++) {
            seats[i].setBooked(false);
            seats[i].setLocked(false);
            segmentTree.update(i, true);
            // only insert back if not already in avl tree
            // easiest way: rebuild avl from scratch
        }
        // rebuild avl tree cleanly
        avlTree = new AVLTree();
        for (int i = 0; i < TOTAL_SEATS; i++) {
            avlTree.insert(i);
        }
    }

    // count free seats in range [l, r] using segment tree
    public int getAvailableCount(int l, int r) {
        if (l < 0 || r >= TOTAL_SEATS || l > r) {
            return -1;
        }
        return segmentTree.query(l, r);
    }

    // find next free seat after position 'from' using avl tree
    // if from is -1 just return the first available seat
    public int getNextAvailable(int from) {
        if (avlTree.isEmpty()) {
            return -1;
        }
        if (from < 0) {
            return avlTree.getMin();
        }
        return avlTree.successor(from);
    }

    private Map<String, Object> buildResult(List<Integer> success, List<String> errors) {
        Map<String, Object> result = new HashMap<>();
        result.put("success", success);
        result.put("errors", errors);
        return result;
    }
}
