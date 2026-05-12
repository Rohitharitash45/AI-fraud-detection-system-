import whois
from datetime import datetime


def get_live_domain_age(domain: str) -> int:
    """
    Queries WHOIS to get the domain age in days.
    Returns 0 if the domain is unverifiable, private, or an error occurs.
    """
    if not domain or '.' not in domain or domain.endswith('.local'):
        return 0

    try:
        w = whois.whois(domain)
        cd = w.creation_date

        if isinstance(cd, list):
            cd = cd[0]

        if cd and isinstance(cd, datetime):
            return (datetime.now() - cd.replace(tzinfo=None)).days

    except Exception:
        pass

    return 0