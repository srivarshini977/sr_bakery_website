export const staffWorkstations = [
  { id: 'chef_1', name: 'Chef 1', role: 'chef', roleLabel: 'Chef', email: 'chef1@srbakery.com', phone: '9876543210' },
  { id: 'chef_2', name: 'Chef 2', role: 'chef', roleLabel: 'Chef', email: 'chef2@srbakery.com', phone: '9876543211' },
  { id: 'tea_master_1', name: 'Tea Master 1', role: 'tea_master', roleLabel: 'Tea Master', email: 'teamaster1@srbakery.com', phone: '9876543212' },
  { id: 'tea_master_2', name: 'Tea Master 2', role: 'tea_master', roleLabel: 'Tea Master', email: 'teamaster2@srbakery.com', phone: '9876543213' },
  { id: 'cashier_1', name: 'Cashier 1', role: 'cashier', roleLabel: 'Cashier', email: 'cashier1@srbakery.com', phone: '9876543214' },
  { id: 'waiter_1', name: 'Waiter 1', role: 'waiter', roleLabel: 'Waiter', email: 'waiter1@srbakery.com', phone: '9876543215' }
];

export const staffWorkstationIds = staffWorkstations.map((station) => station.id);
