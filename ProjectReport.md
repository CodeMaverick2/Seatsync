# Project Report
## SeatSync - Smart Seat Booking System

---

| | |
|---|---|
| **Course** | Efficient tree based data structures |
| **Submitted By** | Tejas Ghatule (Roll No. 10056) - tejas.23bcs10056@sst.scaler.com |
| | Rushil Choudhary (Roll No. 10178) - rushil.23bcs10178@sst.scaler.com |
| **Date** | April 2026 |

---

## Abstract

SeatSync is a full-stack seat booking system that uses a Segment Tree and an AVL Tree to handle seat availability operations efficiently. The system simulates how real-world platforms like BookMyShow work - seats can be locked (held), booked (confirmed), and cancelled. The core idea is that naive array-based approaches for range queries and successor lookups are O(n), and this project replaces both with O(log n) tree-based solutions. The backend is built in Java Spring Boot and the frontend in React.

---

## 1. Introduction

Online ticket booking systems deal with a lot of concurrent seat queries. Two operations come up constantly - "how many seats are free in this block?" and "what's the nearest available seat to where I'm looking?". If you're doing these with plain arrays, you're looping through every seat each time. That's fine for 50 seats but becomes a real problem at scale.

This project was built to demonstrate that both of these can be solved in O(log n) using the right data structures - Segment Tree for range counting and AVL Tree for finding the next available seat. Both are implemented from scratch in Java without using any library.

The system follows a three-step booking flow: Lock → Book → Cancel, which mirrors how real booking platforms hold seats during checkout before confirming them.

---

## 2. Objectives

- Implement a Segment Tree from scratch to answer range availability queries in O(log n)
- Implement an AVL Tree from scratch to find the next available seat after any position in O(log n)
- Keep both trees in sync on every seat state change
- Build a REST API in Spring Boot that exposes these operations
- Build a working frontend in React where all features can be tested
- Handle edge cases cleanly - invalid IDs, wrong order of operations, partial requests, null bodies

---

## 3. System Design

### 3.1 Booking Flow

```
Available (green)
      |
    Lock         <-- seat held while user decides / pays
      |
   Locked (yellow)
      |
    Book         <-- seat confirmed
      |
   Booked (red)
      |
   Cancel        <-- seat released back
      |
Available (green)
```

You can only book a locked seat. You can only cancel a booked seat. This enforces the correct order and avoids dirty state.

### 3.2 Two-Tree Architecture

Both trees are kept in memory in the backend and updated on every operation:

```
Lock/Book/Cancel
       |
       ├──> Update Segment Tree (set leaf to 0 or 1, propagate sum up)
       └──> Update AVL Tree (delete or insert seat ID)
```

Segment Tree answers - "how many free seats in range [l, r]?"
AVL Tree answers - "what is the next free seat after position X?"

They solve different problems and can't replace each other, which is why both are needed.

---

## 4. Data Structures

### 4.1 Segment Tree

#### Concept

A Segment Tree is a binary tree where each node represents a range of elements. In this project, each node stores the count of free seats in its range. Leaf nodes represent individual seats (1 = free, 0 = taken). Parent nodes store the sum of their children.

```
                  [0-49: 50]
                /             \
        [0-24: 25]           [25-49: 25]
        /       \             /        \
   [0-12:13]  [13-24:12]  [25-37:13]  [38-49:12]
   ...         ...          ...         ...
```

The tree is stored as an array (not using pointers). For node at index `i`:
- Left child is at index `2i`
- Right child is at index `2i+1`
- Parent is at `i/2`

Size of the array is `4 * n` to be safe for any n.

#### Build

```
build(node, start, end):
    if start == end:
        tree[node] = 1       // all seats start as free
        return
    mid = (start + end) / 2
    build(2*node, start, mid)
    build(2*node+1, mid+1, end)
    tree[node] = tree[2*node] + tree[2*node+1]
```

#### Update (when a seat is locked/booked/cancelled)

```
update(node, start, end, idx, value):
    if start == end:
        tree[node] = value   // 1 if free, 0 if taken
        return
    mid = (start + end) / 2
    if idx <= mid:
        update(2*node, start, mid, idx, value)
    else:
        update(2*node+1, mid+1, end, idx, value)
    tree[node] = tree[2*node] + tree[2*node+1]
```

#### Range Query

```
query(node, start, end, l, r):
    if r < start or end < l:
        return 0             // completely outside range
    if l <= start and end <= r:
        return tree[node]    // completely inside range
    mid = (start + end) / 2
    return query(2*node, start, mid, l, r)
         + query(2*node+1, mid+1, end, l, r)
```

#### Time and Space Complexity

| Operation | Time Complexity | Reason |
|-----------|----------------|--------|
| Build | O(n) | visits every node once |
| Update | O(log n) | updates one leaf, propagates up tree height |
| Range query [l, r] | O(log n) | combines at most 2 × log n nodes |

**Space:** O(n) - array of size 4n

---

### 4.2 AVL Tree

#### Concept

An AVL Tree is a self-balancing Binary Search Tree. It stores all available seat IDs in sorted order. When a seat is locked or booked, that ID is deleted. When cancelled, it is inserted back.

The key property: for every node, the height difference between left and right subtrees is at most 1. This balance guarantee ensures the height is always O(log n), so all operations stay O(log n).

#### Why not a plain BST?

If seats get locked in order 1, 2, 3, 4, 5... inserts always go to the right child. The BST degrades into a linked list with height n. All operations become O(n). AVL prevents this by rebalancing after every insert and delete.

#### Rotations

There are 4 imbalance cases, each fixed with one or two rotations:

```
Left-Left (right rotation):
        z                y
       / \              / \
      y   T4    -->    x   z
     / \              / \ / \
    x   T3           T1 T2 T3 T4

Right-Right (left rotation): mirror of above

Left-Right (left then right rotation):
      z               z               x
     / \             / \            /   \
    y   T4  -->     x   T4  -->    y     z
   / \             / \            / \   / \
  T1  x           y  T3          T1 T2 T3 T4
     / \         / \
    T2  T3      T1  T2

Right-Left (right then left rotation): mirror of above
```

#### Successor Query

Finding the next available seat after position X:

```
successor(root, key):
    result = -1
    node = root
    while node != null:
        if node.val > key:
            result = node.val    // candidate, but might find closer one on left
            node = node.left
        else:
            node = node.right
    return result
```

This is an iterative walk - no recursion needed. Goes right when current value is too small, goes left when it finds a candidate (to see if a closer one exists on the left).

#### Time and Space Complexity

| Operation | Time Complexity | Reason |
|-----------|----------------|--------|
| Insert | O(log n) | BST insert + at most one rotation per level |
| Delete | O(log n) | BST delete + rotations going up |
| Get minimum | O(log n) | walk left until null |
| Successor (next free after X) | O(log n) | single downward traversal |
| Search | O(log n) | height always O(log n) due to balancing |

**Space:** O(n) - one node per available seat

---

### 4.3 Comparison: Naive vs Tree-based

| Operation | Naive (plain array) | Segment Tree | AVL Tree |
|-----------|-------------------|--------------|----------|
| Count free seats in [l, r] | O(n) loop | **O(log n)** | not suitable |
| Find next free seat after X | O(n) scan | not suitable | **O(log n)** |
| Lock / Book / Cancel one seat | O(1) | O(log n) update | O(log n) update |

Lock, book and cancel go from O(1) to O(log n) because both trees need to be updated. This is the trade-off. For 50 seats it doesn't matter, but for a system with tens of thousands of seats the query performance gain is significant.

---

## 5. Implementation

### 5.1 Backend (Java Spring Boot)

- `Seat.java` - model with id, isBooked, isLocked
- `SegmentTree.java` - array-based segment tree, all methods private except update() and query()
- `AVLTree.java` - self-balancing BST, unified rebalance() method used by both insert and delete
- `SeatService.java` - maintains array of 50 seats + both trees, handles all business logic
- `SeatController.java` - REST endpoints, handles null/missing request bodies gracefully

### 5.2 Frontend (React)

- Single page app, no UI framework, all styling is inline
- Seat grid shows 50 seats across 5 rows (A–E), color coded by status
- Two modes - Booking Mode and Cancellation Mode
- Segment Tree and AVL Tree query panels shown side by side
- Toast notification system for all success/error feedback
- Activity log tracks last 8 operations with timestamps

---

## 6. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /seats | Returns all 50 seats with current status |
| POST | /lock | Locks given seat IDs |
| POST | /book | Books given seat IDs (must be locked first) |
| POST | /cancel | Cancels given booked seat IDs |
| POST | /reset | Resets all seats, rebuilds both trees |
| GET | /availability?l=0&r=9 | Segment tree range query (0-indexed) |
| GET | /next-available?from=5 | AVL successor query (0-indexed) |

Request body format for lock/book/cancel:
```json
{ "seatIds": [0, 1, 2] }
```

Response format (partial success supported):
```json
{ "success": [1, 2], "errors": ["Seat 3 is already booked."] }
```

---

## 7. Edge Cases Handled

- Seat ID below 0 or above 49 - returns descriptive error, not a crash
- Locking an already locked seat - error
- Locking an already booked seat - error
- Booking a seat that was never locked - error with message to lock first
- Booking an already booked seat - error
- Cancelling a seat that is not booked - error
- Empty seat ID list in request - error
- Null or missing request body - handled without NPE
- Range query with missing l or r parameter - error
- Range query where l > r - error
- Successor query when all seats are taken - error
- Mixed valid/invalid IDs in one request - valid ones are processed, errors returned for invalid ones separately

---

## 8. Conclusion

The project successfully demonstrates how tree-based data structures can replace brute-force array operations in a practical system. Both the Segment Tree and AVL Tree were implemented from scratch with no library support, and both are integrated into a working full-stack application.

The main learning from this project was understanding where each structure fits - segment trees are ideal for aggregation over intervals, while AVL trees are ideal for ordered lookups like successor queries. Neither can cleanly do what the other does, which is why the system needs both.

One limitation is that the state is in-memory, so it resets when the server restarts. A real system would persist to a database. The current design is intentionally kept simple to focus on the tree logic.

---
