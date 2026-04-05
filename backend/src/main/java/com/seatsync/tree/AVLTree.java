package com.seatsync.tree;

// AVL Tree - stores IDs of all currently available seats in sorted order
//
// Why AVL tree?
// To find the next free seat after position X, a normal array scan is O(n).
// AVL tree keeps all free seat IDs sorted, so successor(X) is O(log n).
// Also getMin() gives the first free seat in O(log n).
//
// AVL = a self-balancing BST. After every insert or delete it checks
// the balance factor (height difference between left and right).
// If it goes out of range (-1, 0, 1), it does a rotation to fix it.
// This keeps the height at O(log n) always, even in the worst case.
public class AVLTree {

    private static class Node {
        int key;
        int height;
        Node left;
        Node right;

        Node(int key) {
            this.key = key;
            this.height = 1;
        }
    }

    private Node root;

    private int height(Node node) {
        if (node == null) return 0;
        return node.height;
    }

    private void updateHeight(Node node) {
        node.height = 1 + Math.max(height(node.left), height(node.right));
    }

    // positive means left heavy, negative means right heavy
    private int balanceFactor(Node node) {
        if (node == null) return 0;
        return height(node.left) - height(node.right);
    }

    // right rotation - used when left side is too heavy
    private Node rotateRight(Node y) {
        Node x = y.left;
        Node t = x.right;
        x.right = y;
        y.left = t;
        updateHeight(y);
        updateHeight(x);
        return x;
    }

    // left rotation - used when right side is too heavy
    private Node rotateLeft(Node x) {
        Node y = x.right;
        Node t = y.left;
        y.left = x;
        x.right = t;
        updateHeight(x);
        updateHeight(y);
        return y;
    }

    // after every insert or delete, call this to fix any imbalance
    private Node rebalance(Node node) {
        updateHeight(node);
        int balance = balanceFactor(node);

        // left left case
        if (balance > 1 && balanceFactor(node.left) >= 0) return rotateRight(node);
        // left right case
        if (balance > 1 && balanceFactor(node.left) < 0) {
            node.left = rotateLeft(node.left);
            return rotateRight(node);
        }
        // right right case
        if (balance < -1 && balanceFactor(node.right) <= 0) return rotateLeft(node);
        // right left case
        if (balance < -1 && balanceFactor(node.right) > 0) {
            node.right = rotateRight(node.right);
            return rotateLeft(node);
        }

        return node; // already balanced
    }

    public void insert(int key) {
        root = insert(root, key);
    }

    private Node insert(Node node, int key) {
        if (node == null) return new Node(key);
        if (key < node.key) node.left = insert(node.left, key);
        else if (key > node.key) node.right = insert(node.right, key);
        else return node; // already in tree, do nothing
        return rebalance(node);
    }

    public void delete(int key) {
        root = delete(root, key);
    }

    private Node delete(Node node, int key) {
        if (node == null) return null;

        if (key < node.key) {
            node.left = delete(node.left, key);
        } else if (key > node.key) {
            node.right = delete(node.right, key);
        } else {
            // found the node - handle 0, 1, or 2 children
            if (node.left == null) return node.right;
            if (node.right == null) return node.left;
            // two children: replace with in-order successor then delete it
            Node next = minNode(node.right);
            node.key = next.key;
            node.right = delete(node.right, next.key);
        }

        return rebalance(node);
    }

    // first free seat (smallest key in the tree)
    public int getMin() {
        if (root == null) return -1;
        return minNode(root).key;
    }

    private Node minNode(Node node) {
        while (node.left != null) node = node.left;
        return node;
    }

    // next free seat after 'key' - walks the tree without extra space
    public int successor(int key) {
        int result = -1;
        Node node = root;
        while (node != null) {
            if (node.key > key) {
                result = node.key; // could be the answer, look left for a closer one
                node = node.left;
            } else {
                node = node.right; // need something bigger
            }
        }
        return result;
    }

    public boolean isEmpty() {
        return root == null;
    }
}
