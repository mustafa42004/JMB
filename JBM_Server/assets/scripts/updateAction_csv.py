import csv
import sys
import os

def update_csv(file_path, agreement_number, action_status, action_time):
    # Check if file exists
    if not os.path.isfile(file_path):
        print(f"File does not exist: {file_path}")
        return

    # Read the CSV data into memory
    with open(file_path, mode='r', newline='') as file:
        reader = csv.reader(file)
        rows = list(reader)  # Convert the reader object to a list of rows

    if not rows:
        print(f"File '{file_path}' is empty.")
        return

    # Get headers from the first row and initialize column indices
    headers = rows[0]
    action_col_idx = None
    hold_col_idx = None
    release_col_idx = None
    in_yard_col_idx = None

    # Find or create headers for 'ACTION', 'HOLD', 'RELEASE', and 'IN_YARD'
    if 'ACTION' not in headers:
        headers.append('ACTION')
    action_col_idx = headers.index('ACTION')

    if 'HOLD' not in headers:
        headers.append('HOLD')
    hold_col_idx = headers.index('HOLD')

    if 'RELEASE' not in headers:
        headers.append('RELEASE')
    release_col_idx = headers.index('RELEASE')

    if 'IN_YARD' not in headers:
        headers.append('IN_YARD')
    in_yard_col_idx = headers.index('IN_YARD')

    # Update the CSV rows based on agreement_number
    found_agreement = False
    for row in rows[1:]:  # Iterate over rows, starting from the second (skip headers)
        if len(row) < len(headers):
            row.extend([''] * (len(headers) - len(row)))  # Ensure each row has enough columns

        if row[0] == agreement_number:  # Assuming the agreement number is in the first column
            found_agreement = True
            # Update ACTION
            row[action_col_idx] = action_status

            # Update time based on action_status (case insensitive)
            if action_status.lower() == 'hold':
                row[hold_col_idx] = action_time
            elif action_status.lower() == 'release':
                row[release_col_idx] = action_time
            elif action_status.lower() == 'in yard':
                row[in_yard_col_idx] = action_time
            break

    if not found_agreement:
        print(f"Agreement number '{agreement_number}' not found.")

    # Write the updated data back to the CSV file
    with open(file_path, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(headers)  # Write the headers
        writer.writerows(rows[1:])  # Write the data rows

    print(f"File '{file_path}' updated successfully.")

if __name__ == "__main__":
    # Validate arguments
    if len(sys.argv) != 5:
        print("Usage: python updateAction.py <file_path> <agreement_number> <action_status> <action_time>")
        sys.exit(1)

    file_path = sys.argv[1]          # Path to the CSV file
    agreement_number = sys.argv[2]   # Agreement number to find
    action_status = sys.argv[3]      # New action status to set
    action_time = sys.argv[4]        # Time to be recorded

    update_csv(file_path, agreement_number, action_status, action_time)
