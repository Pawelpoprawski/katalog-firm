"""Email service using Resend API."""
import logging
import json
from urllib.request import Request, urlopen
from urllib.error import URLError

logger = logging.getLogger(__name__)

RESEND_API_KEY = None


def _get_api_key() -> str:
    """Get Resend API key from settings."""
    global RESEND_API_KEY
    if RESEND_API_KEY:
        return RESEND_API_KEY
    from .settings import get_settings
    settings = get_settings()
    RESEND_API_KEY = settings.resend_api_key or ""
    return RESEND_API_KEY


def send_email(to: str, subject: str, html: str, from_email: str = "Katalog Firm <onboarding@resend.dev>") -> bool:
    """Send email via Resend API."""
    api_key = _get_api_key()
    if not api_key:
        logger.warning("RESEND_API_KEY not set, skipping email")
        return False

    try:
        data = json.dumps({
            "from": from_email,
            "to": [to],
            "subject": subject,
            "html": html,
        }).encode("utf-8")

        req = Request(
            "https://api.resend.com/emails",
            data=data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        response = urlopen(req, timeout=10)
        result = json.loads(response.read().decode())
        logger.info(f"Email sent to {to}: {result.get('id')}")
        return True
    except URLError as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return False
    except Exception as e:
        logger.error(f"Email error: {e}")
        return False


def send_company_created_email(email: str, company_name: str, edit_token: str, company_slug: str) -> bool:
    """Send email with edit link after company creation."""
    edit_url = f"https://katalog-firm.ch/edycja/{edit_token}"
    company_url = f"https://katalog-firm.ch/firma/{company_slug}"

    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #E30613 0%, #c00510 100%); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Katalog Firm Polonijnych</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">w Szwajcarii</p>
      </div>

      <div style="padding: 32px;">
        <h2 style="color: #1e293b; margin: 0 0 16px;">Twoja firma została dodana!</h2>

        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Firma <strong>{company_name}</strong> została pomyślnie dodana do katalogu.
          Po weryfikacji przez administratora będzie widoczna publicznie.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <p style="color: #1e293b; font-weight: 600; margin: 0 0 12px;">Link do edycji Twojej firmy:</p>
          <a href="{edit_url}" style="display: inline-block; background: #E30613; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Edytuj swoją firmę
          </a>
          <p style="color: #94a3b8; font-size: 12px; margin: 16px 0 0;">
            Lub skopiuj link: <br/>
            <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 11px; word-break: break-all;">{edit_url}</code>
          </p>
        </div>

        <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #854d0e; font-size: 13px; margin: 0;">
            <strong>Zachowaj ten email!</strong> Link do edycji jest unikalny — tylko nim możesz zmieniać dane swojej firmy.
          </p>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 24px;">
          Po publikacji Twoja firma będzie dostępna pod adresem:<br/>
          <a href="{company_url}" style="color: #E30613;">{company_url}</a>
        </p>
      </div>

      <div style="background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          Katalog Firm Polonijnych w Szwajcarii<br/>
          <a href="https://katalog-firm.ch" style="color: #E30613;">katalog-firm.ch</a>
        </p>
      </div>
    </div>
    """

    return send_email(
        to=email,
        subject=f"Twoja firma {company_name} została dodana do katalogu",
        html=html,
    )
