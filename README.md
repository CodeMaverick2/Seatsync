# SeatSync - Smart Seat Booking System

**Course:** Advanced Trees | **Type:** DSA Project

Live demo: https://seatsync-seven.vercel.app/

[Project Report](ProjectReport.md)

## Demo

<video src="Seatsyncd.mov" controls width="100%"></video>

---

## Problem Statement

The goal was to build a seat booking system where the core operations - checking seat availability in a range and finding the next free seat - are done efficiently using tree data structures. A plain array works for small inputs but doesn't scale. This project uses a Segment Tree and an AVL Tree together so that both types of queries run in O(log n) instead of O(n).

The system is modelled after how real-world booking platforms like BookMyShow work - seats get held (locked) while the user is paying, then confirmed (booked), and can be released (cancelled) later.

---

## Approach

Two trees are maintained in memory at all times, both kept in sync on every operation:

- **Segment Tree** handles range queries - how many free seats are there between seat X and seat Y
- **AVL Tree** handles successor queries - what's the next available seat after position X

Every time a seat is locked, booked or cancelled, both trees are updated. This keeps them consistent and means any query at any point reflects the real current state.

---

## Data Structures

### Segment Tree

Used for range availability queries.

The naive way to answer "how many seats are free between seat 5 and seat 30" is a loop - O(n). With a segment tree, the answer is computed in O(log n) by combining precomputed subtree sums.

The tree is array-based. For node at index i, left child is at 2i and right child is at 2i+1. Every leaf stores 1 if the seat is free, 0 if taken. Every internal node stores the sum of its children. So the root always holds the total count of free seats across all 50.

When a seat status changes, we update its leaf and propagate the new sum upward - touching only O(log n) nodes. For a range query [l, r], we recursively split the range into at most O(log n) segments and add their counts.

**Time Complexity**

| Operation | Complexity | Reason |
|-----------|-----------|--------|
| Build | O(n) | visits every node once |
| Update one seat | O(log n) | leaf update + propagate up the height |
| Range count query [l, r] | O(log n) | at most 2 × log n nodes combined |

**Space:** O(n) - array of size 4n

---

### AVL Tree

Used for successor queries - finding the next free seat after a given position.

The tree stores all currently available seat IDs in sorted order. When a seat is locked or booked, its ID is deleted from the tree. When cancelled, it gets inserted back.

Without AVL, finding the next free seat after position 15 means scanning right until you hit a free one - O(n) in worst case. The successor() method on an AVL tree does this in O(log n) by walking down the tree and tracking the best candidate greater than the key.

A plain BST would work in theory but has a problem: if seats get locked in order 1, 2, 3, 4... inserts always go right, the tree degrades into a linked list, and height becomes n. Every operation becomes O(n). AVL prevents this by rebalancing after every insert and delete using rotations. There are 4 cases - Left-Left, Right-Right, Left-Right, Right-Left - and after each fix the height stays at most 1.44 × log2(n), guaranteed.

**Time Complexity**

| Operation | Complexity | Reason |
|-----------|-----------|--------|
| Insert | O(log n) | BST insert + at most 1 rotation per level |
| Delete | O(log n) | BST delete + rotations going up |
| Get minimum | O(log n) | walk left until no left child |
| Successor (next free after X) | O(log n) | single downward traversal |
| Search | O(log n) | height is always bounded |

**Space:** O(n) - one node per available seat

---

### Why both trees, not just one

Segment Tree and AVL Tree solve different problems and can't cleanly replace each other:

- Segment Tree does range count in O(log n) but doesn't support successor queries without extra traversal
- AVL Tree does successor in O(log n) but can't do range count without scanning multiple subtrees

| Operation | Naive Array | Segment Tree | AVL Tree |
|-----------|------------|--------------|----------|
| Count free seats in [l, r] | O(n) | **O(log n)** | not suitable |
| Next free seat after X | O(n) | not suitable | **O(log n)** |
| Lock / Book / Cancel | O(1) | O(log n) update | O(log n) update |

The trade-off is that lock/book/cancel go from O(1) to O(log n) since both trees need to be updated. For 50 seats the difference is negligible, but for a system with thousands of seats the query speedup is worth it.

---

## Features

- **Lock seats** - select any available (green) seat and lock it. It turns yellow. This mimics the seat hold you see on BookMyShow while the user is on the payment screen
- **Book seats** - after locking, confirm the booking. Turns red. You can't book without locking first, thats intentional and matches real booking flows
- **Cancel booking** - switch to Cancellation Mode, click any booked (red) seat to cancel. It goes back to green and gets reinserted into the AVL tree
- **Range availability query** - powered by Segment Tree. Enter a seat range like 1–20 and it returns how many are free in that range instantly
- **Next available seat** - powered by AVL Tree. Enter a position and it finds the next free seat after that position using successor()
- **Reset** - resets all 50 seats to available, rebuilds both trees from scratch

---

## Edge Cases Handled

- Invalid seat ID (negative or > 49) - descriptive error, not a crash
- Locking an already locked or booked seat - error
- Booking without locking first - error, tells the user to lock first
- Cancelling a seat that isn't booked - error
- Empty or null request body - handled, no NPE
- Range query where l > r - error
- Range query with missing params - error
- Next-available when all seats are taken - error
- Partial success - if you send 5 seats and 2 are invalid, the valid 3 go through and the errors come back separately. The whole request doesn't fail because of a few bad seat IDs

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /seats | all 50 seats with current status |
| POST | /lock | lock given seat IDs |
| POST | /book | book locked seat IDs |
| POST | /cancel | cancel booked seat IDs |
| POST | /reset | reset everything |
| GET | /availability?l=0&r=9 | segment tree range query (0-indexed) |
| GET | /next-available?from=5 | AVL successor query (0-indexed) |

Request body (lock / book / cancel):
```json
{ "seatIds": [0, 1, 2] }
```

Response format:
```json
{ "success": [1, 2], "errors": ["Seat 3 is already booked."] }
```

---

## Stack

- **Backend** - Java Spring Boot, REST API, in-memory state
- **Frontend** - React (plain, no UI framework), inline styles
- **Trees** - implemented from scratch in Java, no libraries

---

## Setup

```bash
git clone https://github.com/CodeMaverick2/Seatsync.git
cd Seatsync
./start.sh
```

Script kills any old process on port 8080, builds and starts the backend, waits for it to come up, then starts the frontend. Opens at http://localhost:3000. First run will install npm packages so give it a minute.

Requirements: Java 17+, Maven, Node/npm
