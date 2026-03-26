/**
 * Priority Queue Service
 * Implements min-heap for nearest slot allocation
 * Ported from C++ implementation
 */

class PriorityQueue {
  constructor() {
    this.heap = [];
  }

  // Get parent index
  parent(i) {
    return Math.floor((i - 1) / 2);
  }

  // Get left child index
  leftChild(i) {
    return 2 * i + 1;
  }

  // Get right child index
  rightChild(i) {
    return 2 * i + 2;
  }

  // Swap elements
  swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  // Heapify up
  heapifyUp(index) {
    while (index > 0 && this.heap[this.parent(index)].distance > this.heap[index].distance) {
      this.swap(this.parent(index), index);
      index = this.parent(index);
    }
  }

  // Heapify down
  heapifyDown(index) {
    let smallest = index;
    const left = this.leftChild(index);
    const right = this.rightChild(index);

    if (left < this.heap.length && this.heap[left].distance < this.heap[smallest].distance) {
      smallest = left;
    }

    if (right < this.heap.length && this.heap[right].distance < this.heap[smallest].distance) {
      smallest = right;
    }

    if (smallest !== index) {
      this.swap(index, smallest);
      this.heapifyDown(smallest);
    }
  }

  // Add slot to priority queue
  addSlot(slotId, slotNumber, distance) {
    const slot = { slotId, slotNumber, distance };
    this.heap.push(slot);
    this.heapifyUp(this.heap.length - 1);
  }

  // Get nearest available slot (min distance)
  getNearestSlot() {
    if (this.isEmpty()) {
      return null;
    }

    const nearest = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.heapifyDown(0);
    }

    return nearest;
  }

  // Peek at nearest slot without removing
  peekNearestSlot() {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  // Check if empty
  isEmpty() {
    return this.heap.length === 0;
  }

  // Get size
  size() {
    return this.heap.length;
  }

  // Clear the queue
  clear() {
    this.heap = [];
  }

  // Get all slots (for debugging)
  getAllSlots() {
    return [...this.heap].sort((a, b) => a.distance - b.distance);
  }
}

/**
 * Slot Allocation Service
 * Manages priority queues for different vehicle types
 */
class SlotAllocationService {
  constructor() {
    this.queues = {
      car: new PriorityQueue(),
      bike: new PriorityQueue(),
      truck: new PriorityQueue(),
      electric: new PriorityQueue()
    };
    this.initialized = false;
  }

  // Initialize queues with available slots from database
  async initialize(ParkingSlot) {
    try {
      // Clear existing queues
      Object.values(this.queues).forEach(q => q.clear());

      // Fetch all available slots
      const availableSlots = await ParkingSlot.find({ status: 'available' })
        .select('_id slotNumber type distanceToGate')
        .lean();

      // Add to appropriate queues
      availableSlots.forEach(slot => {
        const type = slot.type.toLowerCase();
        if (this.queues[type]) {
          this.queues[type].addSlot(slot._id.toString(), slot.slotNumber, slot.distanceToGate);
        }
      });

      this.initialized = true;
      console.log('✅ Slot allocation service initialized');
      console.log(`   Cars: ${this.queues.car.size()} slots`);
      console.log(`   Bikes: ${this.queues.bike.size()} slots`);
      console.log(`   Trucks: ${this.queues.truck.size()} slots`);
      console.log(`   Electric: ${this.queues.electric.size()} slots`);

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize slot allocation service:', error);
      return false;
    }
  }

  // Get nearest available slot for vehicle type
  getNearestSlot(vehicleType) {
    const type = vehicleType.toLowerCase();
    if (!this.queues[type]) {
      throw new Error(`Invalid vehicle type: ${vehicleType}`);
    }
    return this.queues[type].getNearestSlot();
  }

  // Return slot to queue (when vehicle leaves)
  returnSlot(vehicleType, slotId, slotNumber, distance) {
    const type = vehicleType.toLowerCase();
    if (!this.queues[type]) {
      throw new Error(`Invalid vehicle type: ${vehicleType}`);
    }
    this.queues[type].addSlot(slotId, slotNumber, distance);
  }

  // Get available count for vehicle type
  getAvailableCount(vehicleType) {
    const type = vehicleType.toLowerCase();
    if (!this.queues[type]) {
      return 0;
    }
    return this.queues[type].size();
  }

  // Get all available counts
  getAllAvailableCounts() {
    return {
      car: this.queues.car.size(),
      bike: this.queues.bike.size(),
      truck: this.queues.truck.size(),
      electric: this.queues.electric.size(),
      total: this.queues.car.size() + this.queues.bike.size() + 
             this.queues.truck.size() + this.queues.electric.size()
    };
  }

  // Check if queue has available slots
  hasAvailableSlot(vehicleType) {
    const type = vehicleType.toLowerCase();
    return this.queues[type] && !this.queues[type].isEmpty();
  }
}

// Singleton instance
const slotAllocationService = new SlotAllocationService();

module.exports = {
  PriorityQueue,
  SlotAllocationService,
  slotAllocationService
};
