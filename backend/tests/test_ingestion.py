import pytest
import io
import pandas as pd
from datetime import datetime, timezone
from app.services.ingestion_service import IngestionService, ExpenseCategoryEnum


def test_expense_keyword_classification():
    assert IngestionService.classify_description("Monthly Rent Payment") == ExpenseCategoryEnum.ESSENTIAL
    assert IngestionService.classify_description("City Water & Power") == ExpenseCategoryEnum.ESSENTIAL
    assert IngestionService.classify_description("Starbucks Downtown Cafe") == ExpenseCategoryEnum.FLEXIBLE
    assert IngestionService.classify_description("Netflix Subscription") == ExpenseCategoryEnum.FLEXIBLE
