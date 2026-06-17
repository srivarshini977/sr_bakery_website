const inventoryByCategory = {
  'Flour & Baking Ingredients': [
    'Maida',
    'Whole Wheat Flour',
    'Corn Flour',
    'Rice Flour',
    'Baking Powder',
    'Baking Soda',
    'Yeast',
    'Bread Improver',
    'Custard Powder',
    'Cocoa Powder',
    'Chocolate Compound',
    'Dark Chocolate',
    'Milk Powder',
    'Vanilla Essence',
    'Strawberry Essence',
    'Butterscotch Essence',
    'Food Colors'
  ],
  'Dairy Products': [
    'Milk',
    'Curd',
    'Butter',
    'Amul Butter',
    'Cheese',
    'Mozzarella Cheese',
    'Cheese Slice',
    'Fresh Cream',
    'Whipping Cream',
    'Paneer',
    'Ghee'
  ],
  Sweeteners: [
    'Sugar',
    'Brown Sugar',
    'Jaggery',
    'Honey',
    'Chocolate Syrup',
    'Caramel Syrup',
    'Strawberry Syrup',
    'Butterscotch Syrup'
  ],
  'Protein & Eggs': [
    'Eggs',
    'Chicken Breast',
    'Boneless Chicken',
    'Chicken Wings',
    'Chicken Lollipop',
    'Chicken Nuggets',
    'Chicken Sausage',
    'Fish Fillet',
    'Crab Meat'
  ],
  Vegetables: [
    'Onion',
    'Tomato',
    'Capsicum',
    'Carrot',
    'Beans',
    'Cabbage',
    'Spring Onion',
    'Garlic',
    'Ginger',
    'Green Chilli',
    'Mint Leaves',
    'Coriander Leaves',
    'Lettuce',
    'Cucumber',
    'Beetroot',
    'Potato',
    'Mushroom',
    'Gobhi (Cauliflower)',
    'Paneer Cubes',
    'Sweet Corn'
  ],
  'Burger Ingredients': [
    'Burger Bun',
    'Veg Patty',
    'Chicken Patty',
    'Zinger Patty',
    'Cheese Slice',
    'Mayonnaise',
    'Burger Sauce',
    'Tomato Ketchup',
    'Mustard Sauce',
    'Lettuce'
  ],
  'Pizza Ingredients': [
    'Pizza Base',
    'Pizza Sauce',
    'Mozzarella Cheese',
    'Capsicum',
    'Onion',
    'Sweet Corn',
    'Mushroom',
    'Paneer',
    'Chicken Topping',
    'Oregano',
    'Chilli Flakes'
  ],
  'Shawarma Ingredients': [
    'Kuboos',
    'Shawarma Bread',
    'Chicken Shawarma Meat',
    'Garlic Mayo',
    'French Fries',
    'Cabbage',
    'Carrot',
    'Onion',
    'Cheese',
    'Peri Peri Sauce'
  ],
  'Fries & Snacks Ingredients': [
    'French Fries',
    'Potato Wedges',
    'Garlic Powder',
    'Peri Peri Seasoning',
    'Chilli Powder',
    'Chat Masala',
    'Cooking Oil'
  ],
  'Noodles & Fried Rice Ingredients': [
    'Noodles',
    'Basmati Rice',
    'Soy Sauce',
    'Red Chilli Sauce',
    'Green Chilli Sauce',
    'Tomato Sauce',
    'Vinegar',
    'Pepper Powder',
    'MSG (optional)',
    'Spring Onion'
  ],
  'Chat Items Ingredients': [
    'Puri',
    'Sev',
    'Boiled Potato',
    'Boiled Chickpeas',
    'Tamarind Chutney',
    'Mint Chutney',
    'Sweet Chutney',
    'Chat Masala',
    'Onion',
    'Coriander'
  ],
  'Manchurian Ingredients': [
    'Corn Flour',
    'Maida',
    'Soy Sauce',
    'Chilli Sauce',
    'Garlic',
    'Ginger',
    'Capsicum',
    'Spring Onion',
    'Oil'
  ],
  'Tea & Beverage Ingredients': [
    'Tea Powder',
    'Coffee Powder',
    'Milk',
    'Sugar',
    'Cardamom',
    'Chocolate Powder',
    'Ice Cubes',
    'Fresh Fruits',
    'Lemon',
    'Mint'
  ],
  'Cake Ingredients': [
    'Cake Premix',
    'Maida',
    'Sugar',
    'Eggs',
    'Butter',
    'Milk',
    'Vanilla Essence',
    'Chocolate Essence',
    'Whipping Cream',
    'Chocolate Chips',
    'Sprinkles',
    'Cherry',
    'Dry Fruits'
  ],
  'Sweets Ingredients': [
    'Besan Flour',
    'Ghee',
    'Sugar',
    'Milk',
    'Milk Powder',
    'Cashew',
    'Almond',
    'Pista',
    'Raisins',
    'Cardamom Powder'
  ],
  'Common Spices': [
    'Salt',
    'Black Pepper',
    'Red Chilli Powder',
    'Turmeric Powder',
    'Garam Masala',
    'Coriander Powder',
    'Cumin Powder',
    'Chat Masala',
    'Peri Peri Mix'
  ],
  'Oils & Cooking Essentials': [
    'Sunflower Oil',
    'Groundnut Oil',
    'Butter',
    'Ghee',
    'Cooking Spray'
  ],
  'Packaging Materials': [
    'Cake Box',
    'Pizza Box',
    'Burger Wrapper',
    'Sandwich Wrapper',
    'Paper Cups',
    'Plastic Cups',
    'Paper Plates',
    'Food Containers',
    'Carry Bags',
    'Tissues',
    'Straws',
    'Wooden Spoons'
  ]
};

const unitFor = (name, category) => {
  if (category === 'Packaging Materials') return 'pcs';
  if (['Eggs', 'Cheese Slice', 'Burger Bun', 'Pizza Base', 'Kuboos', 'Shawarma Bread', 'Puri'].includes(name)) return 'pcs';
  if (name.includes('Sauce') || name.includes('Syrup') || name.includes('Essence') || name.includes('Oil') || name === 'Milk' || name === 'Curd') return 'ltr';
  if (name.includes('Powder') || name.includes('Seasoning') || name.includes('Masala') || name.includes('Flakes') || name.includes('Colors')) return 'kg';
  return 'kg';
};

export const srBakeryInventoryItems = Object.entries(inventoryByCategory).flatMap(([category, names]) =>
  names.map((name) => ({
    name,
    category,
    unit: unitFor(name, category),
    quantity: 0,
    minThreshold: category === 'Packaging Materials' ? 50 : 5,
    costPerUnit: 0
  }))
);

export const srBakeryInventoryCategories = Object.keys(inventoryByCategory);
