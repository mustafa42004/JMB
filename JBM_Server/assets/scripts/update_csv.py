import csv
import sys
import os

def update_csv(file_path, filename, bank_name):
    try:
        if not os.path.isfile(file_path):
            print(f"File does not exist: {file_path}")
            return

        print(f"Updating CSV file: {file_path} with filename: {filename} and bank: {bank_name}")

        # Read the CSV file
        with open(file_path, mode='r', newline='') as file:
            reader = csv.reader(file)
            rows = list(reader)  # Convert the reader object to a list of rows

        # Check if headers exist and add missing ones
        headers = rows[0] if rows else []

        # Adding missing headers
        if 'FILENAME' not in headers:
            headers.append('FILENAME')
        
        if 'BANK' not in headers:
            headers.append('BANK')

        if 'HOLD' not in headers:
            headers.append('HOLD')

        if 'RELEASE' not in headers:
            headers.append('RELEASE')

        if 'IN_YARD' not in headers:
            headers.append('IN_YARD')

        if 'ACTION' not in headers:
            headers.append('ACTION')

        # Update rows: start from the second row (index 1) to avoid headers
        for row in rows[1:]:
            if len(row) < len(headers):  # Ensure row has enough columns for new headers
                row.extend([''] * (len(headers) - len(row)))

            # Get the indices of the headers
            filename_col = headers.index('FILENAME')
            bank_col = headers.index('BANK')
            hold_col = headers.index('HOLD')
            release_col = headers.index('RELEASE')
            in_yard_col = headers.index('IN_YARD')
            action_col = headers.index('ACTION')

            # Update values
            row[filename_col] = filename
            row[bank_col] = bank_name
            row[hold_col] = 'empty'
            row[release_col] = 'empty'
            row[in_yard_col] = 'empty'
            row[action_col] = 'empty'

        # Write the updated data back to the CSV file
        with open(file_path, mode='w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(headers)  # Write the headers
            writer.writerows(rows[1:])  # Write the rest of the rows

        print(f"CSV file updated successfully: {file_path}")

    except Exception as e:
        print(f"Error updating CSV file: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python update_csv.py <file_path> <filename> <bank_name>")
        sys.exit(1)

    file_path = sys.argv[1]  # Path to the CSV file
    filename = sys.argv[2]   # FILENAME to be added
    bank_name = sys.argv[3]  # Bank name to be added
    update_csv(file_path, filename, bank_name)
