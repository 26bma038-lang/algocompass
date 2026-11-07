import type { CodeLang } from "@/engine/codeLang";

/**
 * v1.5: a minimal code template for each Beginner Path lesson, in all four languages. The pattern's
 * shape only, never the answer to one of the lesson's problems. Read shows yours first.
 * `templates.test.ts` compiles them where it can (JavaScript always; C++ when g++ is installed).
 */
export const CODE_TEMPLATES: Record<string, Record<CodeLang, string>> = {
  basics: {
    cpp: `#include <iostream>
using namespace std;

// One loop over n: O(n). A loop inside a loop: O(n²).
long long sumTo(int n) {
    long long total = 0;          // long long: sums pass 2·10⁹ quickly
    for (int i = 1; i <= n; i++) total += i;
    return total;
}

int countPairs(int n) {
    int pairs = 0;
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++) pairs++;
    return pairs;
}

int main() {
    int n;
    cin >> n;
    cout << sumTo(n) << " " << countPairs(n) << "\\n";
}`,
    java: `import java.util.Scanner;

public class Main {
    // One loop over n: O(n). A loop inside a loop: O(n²).
    static long sumTo(int n) {
        long total = 0;           // long: sums pass 2·10⁹ quickly
        for (int i = 1; i <= n; i++) total += i;
        return total;
    }

    static int countPairs(int n) {
        int pairs = 0;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) pairs++;
        return pairs;
    }

    public static void main(String[] args) {
        int n = new Scanner(System.in).nextInt();
        System.out.println(sumTo(n) + " " + countPairs(n));
    }
}`,
    python: `# One loop over n: O(n). A loop inside a loop: O(n²).
def sum_to(n):
    total = 0
    for i in range(1, n + 1):
        total += i
    return total


def count_pairs(n):
    pairs = 0
    for i in range(n):
        for j in range(i + 1, n):
            pairs += 1
    return pairs


n = int(input())
print(sum_to(n), count_pairs(n))`,
    js: `// One loop over n: O(n). A loop inside a loop: O(n²).
function sumTo(n) {
  let total = 0;
  for (let i = 1; i <= n; i++) total += i;
  return total;
}

function countPairs(n) {
  let pairs = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) pairs++;
  return pairs;
}

console.log(sumTo(10), countPairs(10));`,
  },
  arrays: {
    cpp: `#include <vector>
using namespace std;

// Walk the array once, keeping what you've seen so far.
int indexOfMax(const vector<int>& a) {
    int best = 0;
    for (int i = 1; i < (int)a.size(); i++)
        if (a[i] > a[best]) best = i;
    return best;   // a must not be empty
}`,
    java: `class Solution {
    // Walk the array once, keeping what you've seen so far.
    int indexOfMax(int[] a) {
        int best = 0;
        for (int i = 1; i < a.length; i++)
            if (a[i] > a[best]) best = i;
        return best;   // a must not be empty
    }
}`,
    python: `# Walk the array once, keeping what you've seen so far.
def index_of_max(a):
    best = 0
    for i in range(1, len(a)):
        if a[i] > a[best]:
            best = i
    return best  # a must not be empty`,
    js: `// Walk the array once, keeping what you've seen so far.
function indexOfMax(a) {
  let best = 0;
  for (let i = 1; i < a.length; i++)
    if (a[i] > a[best]) best = i;
  return best; // a must not be empty
}`,
  },
  strings: {
    cpp: `#include <string>
using namespace std;

// A string is an array of characters: index it, loop over it.
int countVowels(const string& s) {
    int count = 0;
    for (char c : s)
        if (string("aeiouAEIOU").find(c) != string::npos) count++;
    return count;
}`,
    java: `class Solution {
    // A string is an array of characters: index it, loop over it.
    int countVowels(String s) {
        int count = 0;
        for (char c : s.toCharArray())
            if ("aeiouAEIOU".indexOf(c) >= 0) count++;
        return count;
    }
}`,
    python: `# A string is a sequence of characters: index it, loop over it.
def count_vowels(s):
    count = 0
    for c in s:
        if c in "aeiouAEIOU":
            count += 1
    return count`,
    js: `// A string is a sequence of characters: index it, loop over it.
function countVowels(s) {
  let count = 0;
  for (const c of s)
    if ("aeiouAEIOU".includes(c)) count++;
  return count;
}`,
  },
  hashing: {
    cpp: `#include <unordered_map>
#include <vector>
using namespace std;

// A hash map counts in O(1) per item: one pass instead of a loop inside a loop.
int mostFrequent(const vector<int>& a) {
    unordered_map<int, int> count;
    int best = a[0];
    for (int x : a)
        if (++count[x] > count[best]) best = x;
    return best;
}`,
    java: `import java.util.HashMap;
import java.util.Map;

class Solution {
    // A hash map counts in O(1) per item: one pass instead of a loop inside a loop.
    int mostFrequent(int[] a) {
        Map<Integer, Integer> count = new HashMap<>();
        int best = a[0];
        for (int x : a) {
            count.merge(x, 1, Integer::sum);
            if (count.get(x) > count.get(best)) best = x;
        }
        return best;
    }
}`,
    python: `# A dict counts in O(1) per item: one pass instead of a loop inside a loop.
def most_frequent(a):
    count = {}
    best = a[0]
    for x in a:
        count[x] = count.get(x, 0) + 1
        if count[x] > count[best]:
            best = x
    return best`,
    js: `// A Map counts in O(1) per item: one pass instead of a loop inside a loop.
function mostFrequent(a) {
  const count = new Map();
  let best = a[0];
  for (const x of a) {
    count.set(x, (count.get(x) ?? 0) + 1);
    if (count.get(x) > count.get(best)) best = x;
  }
  return best;
}`,
  },
  "two-pointers": {
    cpp: `#include <vector>
using namespace std;

// Sorted array: one pointer at each end, move the one that gets you closer.
bool hasPairWithSum(const vector<int>& a, int target) {
    int l = 0, r = (int)a.size() - 1;
    while (l < r) {
        int sum = a[l] + a[r];
        if (sum == target) return true;
        if (sum < target) l++;   // need a bigger sum
        else r--;                // need a smaller sum
    }
    return false;
}`,
    java: `class Solution {
    // Sorted array: one pointer at each end, move the one that gets you closer.
    boolean hasPairWithSum(int[] a, int target) {
        int l = 0, r = a.length - 1;
        while (l < r) {
            int sum = a[l] + a[r];
            if (sum == target) return true;
            if (sum < target) l++;   // need a bigger sum
            else r--;                // need a smaller sum
        }
        return false;
    }
}`,
    python: `# Sorted array: one pointer at each end, move the one that gets you closer.
def has_pair_with_sum(a, target):
    l, r = 0, len(a) - 1
    while l < r:
        s = a[l] + a[r]
        if s == target:
            return True
        if s < target:
            l += 1  # need a bigger sum
        else:
            r -= 1  # need a smaller sum
    return False`,
    js: `// Sorted array: one pointer at each end, move the one that gets you closer.
function hasPairWithSum(a, target) {
  let l = 0, r = a.length - 1;
  while (l < r) {
    const sum = a[l] + a[r];
    if (sum === target) return true;
    if (sum < target) l++; // need a bigger sum
    else r--;              // need a smaller sum
  }
  return false;
}`,
  },
  "sliding-window": {
    cpp: `#include <algorithm>
#include <vector>
using namespace std;

// Grow the window on the right; shrink it from the left while it breaks the rule.
int longestWithSumAtMost(const vector<int>& a, int limit) {   // a has no negatives
    int best = 0, left = 0;
    long long sum = 0;
    for (int right = 0; right < (int)a.size(); right++) {
        sum += a[right];
        while (sum > limit) sum -= a[left++];
        best = max(best, right - left + 1);
    }
    return best;
}`,
    java: `class Solution {
    // Grow the window on the right; shrink it from the left while it breaks the rule.
    int longestWithSumAtMost(int[] a, int limit) {   // a has no negatives
        int best = 0, left = 0;
        long sum = 0;
        for (int right = 0; right < a.length; right++) {
            sum += a[right];
            while (sum > limit) sum -= a[left++];
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}`,
    python: `# Grow the window on the right; shrink it from the left while it breaks the rule.
def longest_with_sum_at_most(a, limit):  # a has no negatives
    best = left = total = 0
    for right, x in enumerate(a):
        total += x
        while total > limit:
            total -= a[left]
            left += 1
        best = max(best, right - left + 1)
    return best`,
    js: `// Grow the window on the right; shrink it from the left while it breaks the rule.
function longestWithSumAtMost(a, limit) { // a has no negatives
  let best = 0, left = 0, sum = 0;
  for (let right = 0; right < a.length; right++) {
    sum += a[right];
    while (sum > limit) sum -= a[left++];
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
  },
  "stack-queue": {
    cpp: `#include <queue>
#include <stack>
using namespace std;

// Stack: last in, first out. Queue: first in, first out.
void demo() {
    stack<int> st;
    st.push(1); st.push(2);
    int top = st.top(); st.pop();     // 2
    queue<int> q;
    q.push(1); q.push(2);
    int front = q.front(); q.pop();   // 1
    (void)top; (void)front;
}`,
    java: `import java.util.ArrayDeque;
import java.util.Deque;

class Solution {
    // Stack: last in, first out. Queue: first in, first out.
    void demo() {
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(1); stack.push(2);
        int top = stack.pop();        // 2
        Deque<Integer> queue = new ArrayDeque<>();
        queue.offer(1); queue.offer(2);
        int front = queue.poll();     // 1
    }
}`,
    python: `from collections import deque

# Stack: last in, first out. Queue: first in, first out.
stack = []
stack.append(1)
stack.append(2)
top = stack.pop()  # 2

queue = deque()
queue.append(1)
queue.append(2)
front = queue.popleft()  # 1`,
    js: `// Stack: last in, first out. Queue: first in, first out.
const stack = [];
stack.push(1);
stack.push(2);
const top = stack.pop(); // 2

const queue = [1, 2];
let head = 0;
const front = queue[head++]; // 1 (an index, so taking from the front stays O(1))`,
  },
  "binary-search": {
    cpp: `#include <functional>
using namespace std;

// ok(x) is false, false, …, true, true. Find the first true in [lo, hi].
int firstTrue(int lo, int hi, const function<bool(int)>& ok) {
    int ans = hi + 1;                  // "none" if no x works
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;  // no overflow
        if (ok(mid)) { ans = mid; hi = mid - 1; }
        else lo = mid + 1;
    }
    return ans;
}`,
    java: `import java.util.function.IntPredicate;

class Solution {
    // ok(x) is false, false, …, true, true. Find the first true in [lo, hi].
    int firstTrue(int lo, int hi, IntPredicate ok) {
        int ans = hi + 1;                  // "none" if no x works
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;  // no overflow
            if (ok.test(mid)) { ans = mid; hi = mid - 1; }
            else lo = mid + 1;
        }
        return ans;
    }
}`,
    python: `# ok(x) is False, False, …, True, True. Find the first True in [lo, hi].
def first_true(lo, hi, ok):
    ans = hi + 1  # "none" if no x works
    while lo <= hi:
        mid = (lo + hi) // 2
        if ok(mid):
            ans, hi = mid, mid - 1
        else:
            lo = mid + 1
    return ans`,
    js: `// ok(x) is false, false, …, true, true. Find the first true in [lo, hi].
function firstTrue(lo, hi, ok) {
  let ans = hi + 1; // "none" if no x works
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (ok(mid)) { ans = mid; hi = mid - 1; }
    else lo = mid + 1;
  }
  return ans;
}`,
  },
  recursion: {
    cpp: `// A base case that stops, and a call on a smaller input.
int digitSum(int n) {
    if (n < 10) return n;              // base case
    return n % 10 + digitSum(n / 10);  // smaller problem
}`,
    java: `class Solution {
    // A base case that stops, and a call on a smaller input.
    int digitSum(int n) {
        if (n < 10) return n;              // base case
        return n % 10 + digitSum(n / 10);  // smaller problem
    }
}`,
    python: `# A base case that stops, and a call on a smaller input.
def digit_sum(n):
    if n < 10:
        return n  # base case
    return n % 10 + digit_sum(n // 10)  # smaller problem`,
    js: `// A base case that stops, and a call on a smaller input.
function digitSum(n) {
  if (n < 10) return n;                         // base case
  return (n % 10) + digitSum(Math.floor(n / 10)); // smaller problem
}`,
  },
  "linked-list": {
    cpp: `// Each node points at the next; walk until there's none.
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int v) : val(v), next(nullptr) {}
};

int length(ListNode* head) {
    int n = 0;
    for (ListNode* cur = head; cur != nullptr; cur = cur->next) n++;
    return n;
}`,
    java: `class ListNode {
    int val;
    ListNode next;
    ListNode(int v) { val = v; }
}

class Solution {
    // Each node points at the next; walk until there's none.
    int length(ListNode head) {
        int n = 0;
        for (ListNode cur = head; cur != null; cur = cur.next) n++;
        return n;
    }
}`,
    python: `class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next


# Each node points at the next; walk until there's none.
def length(head):
    n = 0
    cur = head
    while cur is not None:
        n += 1
        cur = cur.next
    return n`,
    js: `class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

// Each node points at the next; walk until there's none.
function length(head) {
  let n = 0;
  for (let cur = head; cur !== null; cur = cur.next) n++;
  return n;
}`,
  },
  trees: {
    cpp: `// Solve it for the left and right subtrees, then combine.
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

int countNodes(TreeNode* root) {
    if (root == nullptr) return 0;   // empty tree
    return 1 + countNodes(root->left) + countNodes(root->right);
}`,
    java: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int v) { val = v; }
}

class Solution {
    // Solve it for the left and right subtrees, then combine.
    int countNodes(TreeNode root) {
        if (root == null) return 0;   // empty tree
        return 1 + countNodes(root.left) + countNodes(root.right);
    }
}`,
    python: `class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


# Solve it for the left and right subtrees, then combine.
def count_nodes(root):
    if root is None:
        return 0  # empty tree
    return 1 + count_nodes(root.left) + count_nodes(root.right)`,
    js: `class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Solve it for the left and right subtrees, then combine.
function countNodes(root) {
  if (root === null) return 0; // empty tree
  return 1 + countNodes(root.left) + countNodes(root.right);
}`,
  },
  graphs: {
    cpp: `#include <queue>
#include <vector>
using namespace std;

// BFS: visit nodes in rings around the start. dist[v] = fewest edges from start.
vector<int> bfs(const vector<vector<int>>& adj, int start) {
    vector<int> dist(adj.size(), -1);
    queue<int> q;
    dist[start] = 0;
    q.push(start);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : adj[u])
            if (dist[v] == -1) { dist[v] = dist[u] + 1; q.push(v); }
    }
    return dist;
}`,
    java: `import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.List;
import java.util.Queue;

class Solution {
    // BFS: visit nodes in rings around the start. dist[v] = fewest edges from start.
    int[] bfs(List<List<Integer>> adj, int start) {
        int[] dist = new int[adj.size()];
        Arrays.fill(dist, -1);
        Queue<Integer> q = new ArrayDeque<>();
        dist[start] = 0;
        q.offer(start);
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : adj.get(u))
                if (dist[v] == -1) { dist[v] = dist[u] + 1; q.offer(v); }
        }
        return dist;
    }
}`,
    python: `from collections import deque


# BFS: visit nodes in rings around the start. dist[v] = fewest edges from start.
def bfs(adj, start):
    dist = [-1] * len(adj)
    dist[start] = 0
    q = deque([start])
    while q:
        u = q.popleft()
        for v in adj[u]:
            if dist[v] == -1:
                dist[v] = dist[u] + 1
                q.append(v)
    return dist`,
    js: `// BFS: visit nodes in rings around the start. dist[v] = fewest edges from start.
function bfs(adj, start) {
  const dist = new Array(adj.length).fill(-1);
  const q = [start];
  dist[start] = 0;
  for (let head = 0; head < q.length; head++) {
    const u = q[head];
    for (const v of adj[u])
      if (dist[v] === -1) { dist[v] = dist[u] + 1; q.push(v); }
  }
  return dist;
}`,
  },
  greedy: {
    cpp: `#include <algorithm>
#include <utility>
#include <vector>
using namespace std;

// Sort, then take the choice that leaves the most room (here: the earliest end).
int maxNonOverlapping(vector<pair<int, int>> intervals) {   // {start, end}
    sort(intervals.begin(), intervals.end(), [](auto& a, auto& b) { return a.second < b.second; });
    int count = 0, lastEnd = -2000000000;
    for (auto& [s, e] : intervals)
        if (s >= lastEnd) { count++; lastEnd = e; }
    return count;
}`,
    java: `import java.util.Arrays;

class Solution {
    // Sort, then take the choice that leaves the most room (here: the earliest end).
    int maxNonOverlapping(int[][] intervals) {   // {start, end}
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));
        int count = 0;
        long lastEnd = Long.MIN_VALUE;
        for (int[] in : intervals)
            if (in[0] >= lastEnd) { count++; lastEnd = in[1]; }
        return count;
    }
}`,
    python: `# Sort, then take the choice that leaves the most room (here: the earliest end).
def max_non_overlapping(intervals):  # [(start, end), ...]
    count, last_end = 0, float("-inf")
    for s, e in sorted(intervals, key=lambda iv: iv[1]):
        if s >= last_end:
            count += 1
            last_end = e
    return count`,
    js: `// Sort, then take the choice that leaves the most room (here: the earliest end).
function maxNonOverlapping(intervals) { // [[start, end], ...]
  const sorted = [...intervals].sort((a, b) => a[1] - b[1]);
  let count = 0, lastEnd = -Infinity;
  for (const [s, e] of sorted)
    if (s >= lastEnd) { count++; lastEnd = e; }
  return count;
}`,
  },
  dp: {
    cpp: `#include <algorithm>
#include <vector>
using namespace std;

// dp[i] = best answer for the first i items, built from smaller answers.
// Here: the largest sum of values with no two neighbours taken.
long long bestNoNeighbours(const vector<int>& a) {
    int n = a.size();
    vector<long long> dp(n + 1, 0);
    for (int i = 1; i <= n; i++) {
        long long take = a[i - 1] + (i >= 2 ? dp[i - 2] : 0);
        dp[i] = max(dp[i - 1], take);
    }
    return dp[n];
}`,
    java: `class Solution {
    // dp[i] = best answer for the first i items, built from smaller answers.
    // Here: the largest sum of values with no two neighbours taken.
    long bestNoNeighbours(int[] a) {
        int n = a.length;
        long[] dp = new long[n + 1];
        for (int i = 1; i <= n; i++) {
            long take = a[i - 1] + (i >= 2 ? dp[i - 2] : 0);
            dp[i] = Math.max(dp[i - 1], take);
        }
        return dp[n];
    }
}`,
    python: `# dp[i] = best answer for the first i items, built from smaller answers.
# Here: the largest sum of values with no two neighbours taken.
def best_no_neighbours(a):
    n = len(a)
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        take = a[i - 1] + (dp[i - 2] if i >= 2 else 0)
        dp[i] = max(dp[i - 1], take)
    return dp[n]`,
    js: `// dp[i] = best answer for the first i items, built from smaller answers.
// Here: the largest sum of values with no two neighbours taken.
function bestNoNeighbours(a) {
  const n = a.length;
  const dp = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    const take = a[i - 1] + (i >= 2 ? dp[i - 2] : 0);
    dp[i] = Math.max(dp[i - 1], take);
  }
  return dp[n];
}`,
  },
};
