"""
Tests for Subtask 2.2: Configure Faker for Mexican locale (Names, RFCs, Addresses)
TDD approach - these tests define what the Mexican data generator should accomplish.
"""
import os
import re
import sys
import pytest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")
sys.path.insert(0, SCRIPTS_DIR)


class TestMexicanDataModule:
    """Test the mexican_data.py module exists and is importable."""

    def test_mexican_data_module_exists(self):
        """mexican_data.py should exist in scripts/."""
        module_path = os.path.join(SCRIPTS_DIR, "mexican_data.py")
        assert os.path.isfile(module_path), "scripts/mexican_data.py not found"

    def test_mexican_data_is_importable(self):
        """mexican_data.py should be importable without errors."""
        import mexican_data
        assert mexican_data is not None


class TestRFCGenerator:
    """Test RFC (Registro Federal de Contribuyentes) generation."""

    def test_generate_rfc_exists(self):
        """generate_rfc function should exist."""
        from mexican_data import generate_rfc
        assert callable(generate_rfc)

    def test_rfc_length(self):
        """RFC should be 13 characters for personas físicas."""
        from mexican_data import generate_rfc, get_faker
        fake = get_faker()
        rfc = generate_rfc(fake)
        assert len(rfc) == 13, f"RFC '{rfc}' should be 13 characters"

    def test_rfc_format_letters(self):
        """RFC should start with 4 uppercase letters."""
        from mexican_data import generate_rfc, get_faker
        fake = get_faker()
        rfc = generate_rfc(fake)
        assert rfc[:4].isalpha(), f"First 4 chars of '{rfc}' should be letters"
        assert rfc[:4].isupper(), f"First 4 chars of '{rfc}' should be uppercase"

    def test_rfc_format_date(self):
        """RFC should have 6 digits (YYMMDD) after letters."""
        from mexican_data import generate_rfc, get_faker
        fake = get_faker()
        rfc = generate_rfc(fake)
        date_part = rfc[4:10]
        assert date_part.isdigit(), f"Date part '{date_part}' should be digits"

    def test_rfc_format_homoclave(self):
        """RFC should end with 3 alphanumeric characters (homoclave)."""
        from mexican_data import generate_rfc, get_faker
        fake = get_faker()
        rfc = generate_rfc(fake)
        homoclave = rfc[10:13]
        assert homoclave.isalnum(), f"Homoclave '{homoclave}' should be alphanumeric"
        assert homoclave.isupper(), f"Homoclave '{homoclave}' should be uppercase"

    def test_rfc_regex_pattern(self):
        """RFC should match the official Mexican RFC pattern."""
        from mexican_data import generate_rfc, get_faker
        fake = get_faker()
        # Official pattern: 4 letters + 6 digits + 3 alphanumeric
        pattern = r'^[A-Z]{4}\d{6}[A-Z0-9]{3}$'
        for _ in range(10):  # Test multiple generations
            rfc = generate_rfc(fake)
            assert re.match(pattern, rfc), f"RFC '{rfc}' doesn't match pattern"


class TestRFCValidation:
    """Test RFC validation function."""

    def test_validate_rfc_exists(self):
        """validate_rfc function should exist."""
        from mexican_data import validate_rfc
        assert callable(validate_rfc)

    def test_validate_rfc_valid(self):
        """Valid RFC should pass validation."""
        from mexican_data import validate_rfc
        assert validate_rfc("XAXX010101ABC")[0] is True

    def test_validate_rfc_invalid_length(self):
        """RFC with wrong length should fail validation."""
        from mexican_data import validate_rfc
        is_valid, error = validate_rfc("XAXX01")
        assert is_valid is False
        assert "length" in error.lower() or "13" in error

    def test_validate_rfc_invalid_format(self):
        """RFC with invalid format should fail validation."""
        from mexican_data import validate_rfc
        is_valid, error = validate_rfc("1234010101ABC")  # Starts with numbers
        assert is_valid is False

    def test_validate_rfc_empty(self):
        """Empty RFC should fail validation."""
        from mexican_data import validate_rfc
        is_valid, error = validate_rfc("")
        assert is_valid is False


class TestMexicanFaker:
    """Test Faker configured for Mexican locale."""

    def test_get_faker_exists(self):
        """get_faker function should exist."""
        from mexican_data import get_faker
        assert callable(get_faker)

    def test_faker_locale_is_mexican(self):
        """Faker should use es_MX locale."""
        from mexican_data import get_faker
        fake = get_faker()
        # Check locale is set correctly
        assert 'es_MX' in str(fake.locales) or 'es_MX' in str(fake.locale)

    def test_faker_generates_company_names(self):
        """Faker should generate company names."""
        from mexican_data import get_faker
        fake = get_faker()
        company = fake.company()
        assert isinstance(company, str)
        assert len(company) > 0

    def test_faker_generates_addresses(self):
        """Faker should generate addresses."""
        from mexican_data import get_faker
        fake = get_faker()
        address = fake.address()
        assert isinstance(address, str)
        assert len(address) > 0

    def test_faker_generates_names(self):
        """Faker should generate person names."""
        from mexican_data import get_faker
        fake = get_faker()
        name = fake.name()
        assert isinstance(name, str)
        assert len(name) > 0


class TestMexicanCompanyData:
    """Test Mexican company data generation."""

    def test_generate_company_exists(self):
        """generate_company function should exist."""
        from mexican_data import generate_company
        assert callable(generate_company)

    def test_company_has_name(self):
        """Generated company should have a name."""
        from mexican_data import generate_company, get_faker
        fake = get_faker()
        company = generate_company(fake)
        assert 'name' in company
        assert len(company['name']) > 0

    def test_company_has_rfc(self):
        """Generated company should have a valid RFC."""
        from mexican_data import generate_company, get_faker, validate_rfc
        fake = get_faker()
        company = generate_company(fake)
        assert 'rfc' in company
        is_valid, _ = validate_rfc(company['rfc'])
        assert is_valid, f"Company RFC '{company['rfc']}' is invalid"

    def test_company_has_address(self):
        """Generated company should have an address."""
        from mexican_data import generate_company, get_faker
        fake = get_faker()
        company = generate_company(fake)
        assert 'address' in company
        assert len(company['address']) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
