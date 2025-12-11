import csv
import io
from typing import List, Dict, Any
from fastapi import HTTPException, status


def parse_csv_content(content_str: str) -> List[Dict[str, Any]]:
    """
    Parse CSV content string and return validated data.
    """
    try:
        csv_reader = csv.DictReader(io.StringIO(content_str))
        rows = list(csv_reader)

        if not rows:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file is empty or has no valid data",
            )

        # Validate that there's at least an email column
        email_column = None
        for field in csv_reader.fieldnames:
            if "email" in field.lower():
                email_column = field
                break

        if not email_column:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file must contain an email column (column name should contain 'email')",
            )

        # Validate email addresses and clean data
        valid_rows = []
        for row in rows:
            # Check if email field has a value and is valid-looking
            email_value = row.get(email_column, "").strip()
            if not email_value or "@" not in email_value:
                continue  # Skip rows without valid email

            # Clean the row data - remove empty values
            cleaned_row = {}
            for key, value in row.items():
                if value and str(value).strip():
                    cleaned_row[key] = str(value).strip()

            # Ensure email is present
            if email_column in cleaned_row:
                valid_rows.append(cleaned_row)

        if not valid_rows:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid rows found with email addresses",
            )

        # Limit the number of rows to prevent memory issues
        if len(valid_rows) > 10000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file cannot contain more than 10,000 rows",
            )

        return valid_rows

    except csv.Error as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error parsing CSV file: {str(e)}",
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error processing CSV file: {str(e)}",
        )
