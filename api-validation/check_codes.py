import json

data = json.load(open('AIValidation.Api/docs/analysis/03_Icd_data/icd_rows.json', encoding='utf-8'))

examples = ['A90', 'B59', 'C83.2', 'C83.6', 'B95', 'B95.0', 'C53.9', 'C54.0', 'P95', 'O97.0', 'S18']

print('Searching for examples in JSON...')
print('Format: Code -> Flag\n')

for code in examples:
    for row in data:
        if row[0] == code:
            flag = row[9]
            print(f'{code:10} -> Flag {flag:3d}')
            break
    else:
        print(f'{code:10} -> NOT FOUND')

# Decode flags
print('\nFlag meanings:')
print('1   = Cancelled')
print('4   = Not main')
print('8   = Not recommended main')
print('16  = Needs specific')
print('32  = Death only')
print('64  = Female only')
print('128 = Male only')
print('256 = Dagger (†)')
print('512 = Asterisk (*)')
