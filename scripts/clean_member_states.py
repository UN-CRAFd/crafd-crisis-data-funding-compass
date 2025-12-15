import pandas as pd
import numpy as np

# Import of CSV file
df = pd.read_csv('/public/data/member-states.csv')
df_current = df[df['End date'].isna()]
df_current = df_current['Member State'].tolist()

df_current.to_csv('/public/data/current_member_states.csv', index=False)