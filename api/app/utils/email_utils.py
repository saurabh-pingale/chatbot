import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ssl

from app import config
from app.utils.logger import logger

async def send_otp_email(to_email: str, otp: str):
    sender_email = config.SMTP_SENDER_EMAIL
    password = config.SMTP_PASSWORD
    smtp_server = config.SMTP_SERVER
    smtp_port = int(config.SMTP_PORT) if config.SMTP_PORT else None

    if not all([sender_email, password, smtp_server, smtp_port]):
        logger.error("SMTP settings are not configured. Cannot send email.")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = "Your OTP Code"
    message["From"] = sender_email
    message["To"] = to_email

    text = f"Hi,\\nYour OTP code is {otp}"
    html = f"""\\
    <html>
      <body>
        <p>Hi,<br>
           Your OTP code is <strong>{otp}</strong>
        </p>
      </body>
    </html>
    """

    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")

    message.attach(part1)
    message.attach(part2)

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls(context=context)
            server.login(sender_email, password)
            server.sendmail(sender_email, to_email, message.as_string())
        logger.info(f"OTP email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}", exc_info=True)
        raise 