"""
Payment provider abstraction layer.

New providers (e.g. Pix) are added by:
  1. Creating a class that satisfies PaymentProvider in base.py
  2. Registering it in registry.py
  3. Adding the corresponding payment_method_preference value
"""
