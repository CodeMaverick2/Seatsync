package com.seatsync.tree;

// Segment Tree - each node stores count of free seats in its range
//
// Why segment tree?
// If we want to know how many seats are free from seat 5 to seat 20,
// a normal loop would check all of them one by one - O(n).
// Segment tree stores the count at each level so we can answer in O(log n).
//
// Array based, node i has left child at 2*i and right child at 2*i+1
public class SegmentTree {

    private int[] tree;
    private int n;

    public SegmentTree(int n) {
        this.n = n;
        this.tree = new int[4 * n];
        build(1, 0, n - 1);
    }

    // fill the tree, every seat starts as free so every leaf = 1
    private void build(int node, int start, int end) {
        if (start == end) {
            tree[node] = 1;
        } else {
            int mid = (start + end) / 2;
            build(2 * node, start, mid);
            build(2 * node + 1, mid + 1, end);
            tree[node] = tree[2 * node] + tree[2 * node + 1];
        }
    }

    // update one seat - set it free (true) or taken (false)
    public void update(int idx, boolean free) {
        update(1, 0, n - 1, idx, free);
    }

    private void update(int node, int start, int end, int idx, boolean free) {
        if (start == end) {
            tree[node] = free ? 1 : 0;
        } else {
            int mid = (start + end) / 2;
            if (idx <= mid) {
                update(2 * node, start, mid, idx, free);
            } else {
                update(2 * node + 1, mid + 1, end, idx, free);
            }
            tree[node] = tree[2 * node] + tree[2 * node + 1];
        }
    }

    // count free seats between index l and r
    public int query(int l, int r) {
        return query(1, 0, n - 1, l, r);
    }

    private int query(int node, int start, int end, int l, int r) {
        if (r < start || end < l) {
            return 0; // this range is completely outside what we want
        }
        if (l <= start && end <= r) {
            return tree[node]; // this range is completely inside what we want
        }
        int mid = (start + end) / 2;
        int left = query(2 * node, start, mid, l, r);
        int right = query(2 * node + 1, mid + 1, end, l, r);
        return left + right;
    }
}
