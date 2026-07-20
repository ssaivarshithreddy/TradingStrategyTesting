import YahooFinanceClass from 'yahoo-finance2';
const yahooFinance = new YahooFinanceClass();

async function test() {
  const symbols = ['GC=F', 'XAUUSD=X'];
  const now = new Date();
  const startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

  for (const sym of symbols) {
    console.log(`\nTesting symbol: ${sym}`);
    try {
      const result = await yahooFinance.chart(sym, {
        period1: startDate,
        interval: '1h',
      });
      console.log(`[SUCCESS] Fetched data for ${sym}! Quotes count: ${result.quotes.length}`);
      if (result.quotes.length > 0) {
        console.log('Sample quote:', result.quotes[0]);
      }
    } catch (e) {
      console.log(`[FAILED] for ${sym}: ${e.message}`);
    }
  }
}

test();
