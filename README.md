# SeatSync - Smart Seat Booking System

DSA project for Advanced Trees course. Basically simulates a movie seat booking system like BookMyShow but the whole point is using Segment Tree and AVL Tree to make operations fast. Both trees serve different purposes and together cover everything in O(log n).

---

## Setup

```bash
git clone https://github.com/CodeMaverick2/Seatsync.git
cd Seatsync
./start.sh
```

That's it. The script kills any old process on port 8080, starts the backend, waits for it to come up, then starts the frontend. Opens at http://localhost:3000.

First time it'll install frontend packages automatically so might take a minute.

Requirements: Java 17+, Maven, Node/npm

---

## Features

- **Lock seats** - select any green seat and lock it. Turns yellow. This represents holding the seat while the user completes payment, same as how BookMyShow works
- **Book seats** - after locking, you can book. Turns red. You can't book without locking first, that's intentional
- **Cancel booking** - switch to Cancellation Mode, click any red seat to cancel. Goes back to green and becomes available again
- **Range availability query** - uses Segment Tree to count how many seats are free in a given range. Enter seat 1 to 10 and it tells you instantly
- **Next available seat** - uses AVL Tree to find the next free seat after any position. Useful for finding closest available seat
- **Reset** - button in the header, resets all 50 seats back to available and clears both trees

---

## Data Structures

### Segment Tree

Used for range queries - "how many seats are free between seat 5 and seat 30?"

Without a segment tree you'd loop through every seat in that range and count. That's O(n) per query which gets slow. The segment tree stores the count of free seats at every level so you can combine just a few nodes and get the answer in O(log n).

It's array based. Node i has children at 2i and 2i+1. Every leaf is either 1 (free) or 0 (taken). Every parent stores the sum of its children. So the root always has the total count of free seats.

When a seat gets locked or booked, we update that leaf and propagate the change up. When we query a range we split it into at most O(log n) nodes and add them up.

**Time Complexity:**

| Operation | Time | Why |
|-----------|------|-----|
| Build | O(n) | visits every node once |
| Update one seat | O(log n) | updates leaf + propagates up the height |
| Range count query [l, r] | O(log n) | combines at most 2 * log n nodes |

**Space Complexity:** O(n) — array of size 4n

### AVL Tree

Used for successor queries - "what's the next free seat after seat 15?"

Stores all currently available seat IDs in sorted order. When a seat gets locked we delete it from the tree. When a seat gets cancelled we insert it back.

Without AVL you'd scan left to right from position 15 until you find a free one. In the worst case (everything before is booked) that's O(n). AVL's successor() walks the tree and finds it in O(log n).

Why AVL and not a plain BST? If seats get locked in order 1, 2, 3, 4... a plain BST becomes a straight line — height equals n, every operation degrades to O(n). AVL rebalances itself after every insert and delete using rotations. There are 4 cases — left-left, right-right, left-right, right-left. After fixing, height stays at most 1.44 * log2(n) guaranteed.

**Time Complexity:**

| Operation | Time | Why |
|-----------|------|-----|
| Insert | O(log n) | BST insert + at most 1 rotation going up |
| Delete | O(log n) | BST delete + at most O(log n) rotations going up |
| Get minimum | O(log n) | go left until no left child |
| Successor (next free after X) | O(log n) | single traversal down the tree |
| Search | O(log n) | height is always O(log n) |

**Space Complexity:** O(n) — one node per available seat

### Comparison: naive vs with data structures

| Operation | Naive (plain array) | Segment Tree | AVL Tree |
|-----------|-------------------|--------------|----------|
| Count free seats in range [l, r] | O(n) loop | **O(log n)** | not suitable |
| Find next free seat after X | O(n) scan | not suitable | **O(log n)** |
| Lock / Book / Cancel one seat | O(1) | O(log n) update | O(log n) update |

The trade-off is that lock/book/cancel go from O(1) to O(log n) because we update both trees. But for 50 seats that's fine, and for a system with thousands of seats the range query and successor speedup is worth it.

### Why both

Segment Tree does range count. AVL Tree does next-available. They can't cleanly replace each other:

- Segment Tree doesn't support successor queries without extra traversal logic
- AVL Tree can't do range count without scanning multiple nodes

Both trees update together on every lock, book and cancel so they always stay consistent with each other.

---

## API Endpoints

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | /seats | Returns all 50 seats with their status |
| POST | /lock | Locks given seat IDs |
| POST | /book | Books locked seat IDs |
| POST | /cancel | Cancels booked seat IDs |
| POST | /reset | Resets everything back to 50 free seats |
| GET | /availability?l=0&r=9 | Segment tree range query (0-indexed) |
| GET | /next-available?from=5 | AVL tree successor query (0-indexed) |

Request body for lock/book/cancel:
```json
{ "seatIds": [0, 1, 2] }
```

Response always has two fields:
```json
{ "success": [1, 2], "errors": ["Seat 3 is already booked."] }
```

So if you send 5 seats and 2 fail, you still get the 3 that worked along with specific error messages for the ones that didn't.

---

## Edge Cases Handled

- Invalid seat ID (negative or greater than 49) - clean error message
- Locking an already locked seat - error
- Locking an already booked seat - error  
- Booking a seat that was never locked - error, tells you to lock first
- Booking an already booked seat - error
- Cancelling a seat that isn't booked - error
- Empty request list - error
- Null or missing request body - error, no crash
- Availability query with missing l or r params - error
- Availability where l is greater than r - error
- Next-available when all seats are taken - error

Mixed requests work too - if you send 5 seats and some are valid and some aren't, it processes the valid ones and returns errors for the rest. Doesn't fail the whole request.

---

## Project Structure

```
seatsync/
├── start.sh                          <- run this
├── README.md
├── .gitignore
├── backend/
│   ├── .gitignore
│   ├── pom.xml
│   └── src/main/java/com/seatsync/
│       ├── SeatSyncApplication.java
│       ├── model/Seat.java           <- seat with id, isBooked, isLocked
│       ├── tree/SegmentTree.java     <- range count queries
│       ├── tree/AVLTree.java         <- successor queries
│       ├── service/SeatService.java  <- all the logic, maintains both trees
│       └── controller/SeatController.java  <- REST endpoints
└── frontend/
    ├── .gitignore
    ├── package.json
    ├── public/index.html
    └── src/
        ├── index.js
        ├── index.css
        ├── App.js                    <- main UI, all API calls, toast system
        └── SeatGrid.js               <- seat grid component
```
