"""
Test Suite for Subtask 2.5: Implement data randomization logic

Tests verify:
- generate_invoice_data() returns complete invoice structure
- All required fields are present
- Data types are correct
- Numerical calculations are accurate
- Random variation exists between generated invoices
- Mexican-specific data formats are correct
"""

import pytest
from datetime import date, datetime
from decimal import Decimal
import sys
from pathlib import Path

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


class TestGenerateInvoiceDataExists:
    """Test that the generate_invoice_data function exists and is importable."""

    def test_can_import_function(self):
        """Should be able to import generate_invoice_data."""
        from invoice_data import generate_invoice_data
        assert callable(generate_invoice_data)

    def test_can_import_module(self):
        """Should be able to import invoice_data module."""
        import invoice_data
        assert hasattr(invoice_data, 'generate_invoice_data')


class TestInvoiceDataStructure:
    """Test the structure of generated invoice data."""

    @pytest.fixture
    def invoice(self):
        """Generate a single invoice for testing."""
        from invoice_data import generate_invoice_data
        return generate_invoice_data()

    def test_returns_dictionary(self, invoice):
        """generate_invoice_data should return a dictionary."""
        assert isinstance(invoice, dict)

    def test_has_emisor(self, invoice):
        """Invoice should have emisor (issuer) data."""
        assert 'emisor' in invoice
        assert isinstance(invoice['emisor'], dict)

    def test_has_receptor(self, invoice):
        """Invoice should have receptor (recipient) data."""
        assert 'receptor' in invoice
        assert isinstance(invoice['receptor'], dict)

    def test_has_date(self, invoice):
        """Invoice should have a date."""
        assert 'date' in invoice

    def test_has_folio(self, invoice):
        """Invoice should have a folio number."""
        assert 'folio' in invoice
        assert isinstance(invoice['folio'], str)
        assert len(invoice['folio']) >= 4  # At least 4 characters

    def test_has_items(self, invoice):
        """Invoice should have items list."""
        assert 'items' in invoice
        assert isinstance(invoice['items'], list)
        assert len(invoice['items']) >= 1

    def test_has_subtotal(self, invoice):
        """Invoice should have subtotal."""
        assert 'subtotal' in invoice
        assert isinstance(invoice['subtotal'], (int, float))

    def test_has_iva(self, invoice):
        """Invoice should have IVA (tax)."""
        assert 'iva' in invoice
        assert isinstance(invoice['iva'], (int, float))

    def test_has_total(self, invoice):
        """Invoice should have total."""
        assert 'total' in invoice
        assert isinstance(invoice['total'], (int, float))

    def test_has_currency(self, invoice):
        """Invoice should have currency code."""
        assert 'currency' in invoice
        assert invoice['currency'] in ['MXN', 'USD', 'EUR']


class TestEmisorData:
    """Test the emisor (issuer) data structure."""

    @pytest.fixture
    def emisor(self):
        """Get emisor data from generated invoice."""
        from invoice_data import generate_invoice_data
        return generate_invoice_data()['emisor']

    def test_emisor_has_name(self, emisor):
        """Emisor should have a name."""
        assert 'name' in emisor
        assert isinstance(emisor['name'], str)
        assert len(emisor['name']) >= 3

    def test_emisor_has_rfc(self, emisor):
        """Emisor should have an RFC."""
        assert 'rfc' in emisor
        assert isinstance(emisor['rfc'], str)
        assert len(emisor['rfc']) in [12, 13]  # Valid RFC lengths

    def test_emisor_has_address(self, emisor):
        """Emisor should have an address."""
        assert 'address' in emisor
        assert isinstance(emisor['address'], str)
        assert len(emisor['address']) >= 10


class TestReceptorData:
    """Test the receptor (recipient) data structure."""

    @pytest.fixture
    def receptor(self):
        """Get receptor data from generated invoice."""
        from invoice_data import generate_invoice_data
        return generate_invoice_data()['receptor']

    def test_receptor_has_name(self, receptor):
        """Receptor should have a name."""
        assert 'name' in receptor
        assert isinstance(receptor['name'], str)
        assert len(receptor['name']) >= 3

    def test_receptor_has_rfc(self, receptor):
        """Receptor should have an RFC."""
        assert 'rfc' in receptor
        assert isinstance(receptor['rfc'], str)
        assert len(receptor['rfc']) in [12, 13]

    def test_receptor_has_address(self, receptor):
        """Receptor should have an address."""
        assert 'address' in receptor
        assert isinstance(receptor['address'], str)
        assert len(receptor['address']) >= 10


class TestItemsData:
    """Test the items (line items) data structure."""

    @pytest.fixture
    def items(self):
        """Get items from generated invoice."""
        from invoice_data import generate_invoice_data
        return generate_invoice_data()['items']

    def test_items_not_empty(self, items):
        """Items list should not be empty."""
        assert len(items) >= 1

    def test_items_reasonable_count(self, items):
        """Items should have reasonable count (1-15)."""
        assert 1 <= len(items) <= 15

    def test_item_has_description(self, items):
        """Each item should have a description."""
        for item in items:
            assert 'description' in item
            assert isinstance(item['description'], str)
            assert len(item['description']) >= 3

    def test_item_has_quantity(self, items):
        """Each item should have quantity."""
        for item in items:
            assert 'quantity' in item
            assert isinstance(item['quantity'], (int, float))
            assert item['quantity'] > 0

    def test_item_has_unit_price(self, items):
        """Each item should have unit price."""
        for item in items:
            assert 'unit_price' in item
            assert isinstance(item['unit_price'], (int, float))
            assert item['unit_price'] > 0

    def test_item_has_amount(self, items):
        """Each item should have amount (quantity * unit_price)."""
        for item in items:
            assert 'amount' in item
            assert isinstance(item['amount'], (int, float))
            assert item['amount'] > 0

    def test_item_amount_calculation(self, items):
        """Item amount should equal quantity * unit_price."""
        for item in items:
            expected = round(item['quantity'] * item['unit_price'], 2)
            assert abs(item['amount'] - expected) < 0.01


class TestCalculations:
    """Test numerical calculations in invoice."""

    @pytest.fixture
    def invoice(self):
        """Generate invoice for calculation tests."""
        from invoice_data import generate_invoice_data
        return generate_invoice_data()

    def test_subtotal_is_sum_of_items(self, invoice):
        """Subtotal should be sum of all item amounts."""
        expected_subtotal = sum(item['amount'] for item in invoice['items'])
        assert abs(invoice['subtotal'] - expected_subtotal) < 0.01

    def test_iva_is_16_percent(self, invoice):
        """IVA should be 16% of subtotal."""
        expected_iva = round(invoice['subtotal'] * 0.16, 2)
        assert abs(invoice['iva'] - expected_iva) < 0.01

    def test_total_is_subtotal_plus_iva(self, invoice):
        """Total should be subtotal + IVA."""
        expected_total = round(invoice['subtotal'] + invoice['iva'], 2)
        assert abs(invoice['total'] - expected_total) < 0.01

    def test_all_amounts_positive(self, invoice):
        """All monetary amounts should be positive."""
        assert invoice['subtotal'] > 0
        assert invoice['iva'] >= 0
        assert invoice['total'] > 0


class TestDateField:
    """Test the date field."""

    @pytest.fixture
    def invoice_date(self):
        """Get date from generated invoice."""
        from invoice_data import generate_invoice_data
        return generate_invoice_data()['date']

    def test_date_is_string_or_date(self, invoice_date):
        """Date should be string or date object."""
        assert isinstance(invoice_date, (str, date, datetime))

    def test_date_format_if_string(self, invoice_date):
        """If date is string, should be in valid format."""
        if isinstance(invoice_date, str):
            # Try common formats
            formats = ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d']
            parsed = False
            for fmt in formats:
                try:
                    datetime.strptime(invoice_date, fmt)
                    parsed = True
                    break
                except ValueError:
                    continue
            assert parsed, f"Date string '{invoice_date}' not in recognized format"

    def test_date_not_in_future(self, invoice_date):
        """Date should not be in the future."""
        if isinstance(invoice_date, str):
            formats = ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d']
            for fmt in formats:
                try:
                    parsed_date = datetime.strptime(invoice_date, fmt).date()
                    break
                except ValueError:
                    continue
        else:
            parsed_date = invoice_date if isinstance(invoice_date, date) else invoice_date.date()

        assert parsed_date <= date.today()


class TestRandomization:
    """Test that data is properly randomized."""

    def test_multiple_invoices_different(self):
        """Multiple invoices should have different data."""
        from invoice_data import generate_invoice_data

        invoices = [generate_invoice_data() for _ in range(5)]

        # Check folios are different
        folios = [inv['folio'] for inv in invoices]
        assert len(set(folios)) >= 3, "Folios should vary between invoices"

    def test_totals_vary(self):
        """Totals should vary between invoices."""
        from invoice_data import generate_invoice_data

        totals = [generate_invoice_data()['total'] for _ in range(10)]
        unique_totals = len(set(totals))
        assert unique_totals >= 5, "Totals should vary significantly"

    def test_item_counts_vary(self):
        """Number of items should vary between invoices."""
        from invoice_data import generate_invoice_data

        counts = [len(generate_invoice_data()['items']) for _ in range(20)]
        unique_counts = len(set(counts))
        assert unique_counts >= 3, "Item counts should vary"


class TestSeedReproducibility:
    """Test that seed parameter produces reproducible results."""

    def test_same_seed_same_result(self):
        """Same seed should produce same invoice."""
        from invoice_data import generate_invoice_data

        invoice1 = generate_invoice_data(seed=12345)
        invoice2 = generate_invoice_data(seed=12345)

        assert invoice1['folio'] == invoice2['folio']
        assert invoice1['total'] == invoice2['total']
        assert len(invoice1['items']) == len(invoice2['items'])

    def test_different_seed_different_result(self):
        """Different seeds should produce different invoices."""
        from invoice_data import generate_invoice_data

        invoice1 = generate_invoice_data(seed=11111)
        invoice2 = generate_invoice_data(seed=22222)

        # At least some fields should be different
        different = (
            invoice1['folio'] != invoice2['folio'] or
            invoice1['total'] != invoice2['total'] or
            invoice1['emisor']['name'] != invoice2['emisor']['name']
        )
        assert different, "Different seeds should produce different data"


class TestPriceRanges:
    """Test that prices are in realistic ranges."""

    def test_unit_prices_realistic(self):
        """Unit prices should be in realistic range (1 - 100,000)."""
        from invoice_data import generate_invoice_data

        for _ in range(10):
            invoice = generate_invoice_data()
            for item in invoice['items']:
                assert 1 <= item['unit_price'] <= 100000, \
                    f"Unit price {item['unit_price']} out of range"

    def test_quantities_realistic(self):
        """Quantities should be in realistic range (1 - 1000)."""
        from invoice_data import generate_invoice_data

        for _ in range(10):
            invoice = generate_invoice_data()
            for item in invoice['items']:
                assert 1 <= item['quantity'] <= 1000, \
                    f"Quantity {item['quantity']} out of range"


class TestRFCValidation:
    """Test that generated RFCs are valid format."""

    def test_emisor_rfc_format(self):
        """Emisor RFC should be valid format."""
        from invoice_data import generate_invoice_data
        from mexican_data import validate_rfc

        for _ in range(5):
            invoice = generate_invoice_data()
            rfc = invoice['emisor']['rfc']
            is_valid, error = validate_rfc(rfc)
            assert is_valid, f"Invalid emisor RFC: {rfc} - {error}"

    def test_receptor_rfc_format(self):
        """Receptor RFC should be valid format."""
        from invoice_data import generate_invoice_data
        from mexican_data import validate_rfc

        for _ in range(5):
            invoice = generate_invoice_data()
            rfc = invoice['receptor']['rfc']
            is_valid, error = validate_rfc(rfc)
            assert is_valid, f"Invalid receptor RFC: {rfc} - {error}"


class TestProductDescriptions:
    """Test that product descriptions are realistic."""

    def test_descriptions_are_strings(self):
        """All descriptions should be non-empty strings."""
        from invoice_data import generate_invoice_data

        invoice = generate_invoice_data()
        for item in invoice['items']:
            assert isinstance(item['description'], str)
            assert len(item['description'].strip()) > 0

    def test_descriptions_reasonable_length(self):
        """Descriptions should have reasonable length."""
        from invoice_data import generate_invoice_data

        invoice = generate_invoice_data()
        for item in invoice['items']:
            assert 3 <= len(item['description']) <= 200
