from dukascopy_python import Dukascopy
import pandas as pd
from datetime import datetime

# Initialize Dukascopy client
client = Dukascopy()

# Current month start
start = datetime(datetime.now().year, datetime.now().month, 1)

# Current time
end = datetime.now()

# Download XAU/USD 30-minute candles
df = client.get_history(
    instrument="XAUUSD",
    start=start,
    end=end,
    timeframe="30min"
)

print(df.head())

# Save to CSV
df.to_csv("XAUUSD_M30_CurrentMonth.csv", index=False)

print(f"Downloaded {len(df)} candles")