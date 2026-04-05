package com.seatsync.model;

public class Seat {

    private int id;
    private boolean isBooked;
    private boolean isLocked;

    public Seat(int id) {
        this.id = id;
        this.isBooked = false;
        this.isLocked = false;
    }

    public int getId() { return id; }

    public boolean isBooked() { return isBooked; }
    public void setBooked(boolean booked) { isBooked = booked; }

    public boolean isLocked() { return isLocked; }
    public void setLocked(boolean locked) { isLocked = locked; }

    public boolean isAvailable() { return !isBooked && !isLocked; }
}
