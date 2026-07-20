import * as yfAll from 'yahoo-finance2';

console.log('All exports:', Object.keys(yfAll));
console.log('Default export keys:', Object.keys(yfAll.default || {}));
console.log('Type of default export:', typeof yfAll.default);

if (yfAll.default) {
  const proto = Object.getPrototypeOf(yfAll.default);
  console.log('Prototype of default export:', proto ? Object.getOwnPropertyNames(proto) : 'none');
  
  if (typeof yfAll.default === 'function') {
    console.log('Prototype of default function class:', Object.getOwnPropertyNames(yfAll.default.prototype || {}));
  }
}

// Check if we can find any method like quote or historical or chart anywhere
for (const key of Object.keys(yfAll)) {
  console.log(`export [${key}] has quote:`, typeof yfAll[key]?.quote);
}
