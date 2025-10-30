import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ssl

from app import config
from app.utils.logger import logger

async def send_otp_email(to_email: str, otp: str, shop_domain):
    sender_email = config.SMTP_SENDER_EMAIL
    password = config.SMTP_PASSWORD
    smtp_server = config.SMTP_SERVER
    smtp_port = int(config.SMTP_PORT) if config.SMTP_PORT else None

    if not all([sender_email, password, smtp_server, smtp_port]):
        logger.error("SMTP settings are not configured. Cannot send email.")
        return
    
    store_name = " ".join(
        part.capitalize() 
        for part in shop_domain.replace(".myshopify.com", "").split("-")
    )
    company_name = "ReezoAI"

    message = MIMEMultipart("alternative")
    message["Subject"] = f"Your {store_name} Verification Code"
    message["From"] = sender_email
    message["To"] = to_email

    text = f"""\
      Hi,
      
      Your verification code for {store_name} is: {otp}
      
      This code will expire in 5 minutes.
      
      Thanks,
      The {store_name} Team

      Powered by {company_name}
      """

    html = f"""\
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <h2 style="color: #2c3e50; margin-top: 0;">{store_name}</h2>
            <p>Hi,</p>
            <p>Your verification code is:</p>
            <div style="background-color: #e9ecef; padding: 10px 15px; border-radius: 4px; font-size: 24px; font-weight: bold; letter-spacing: 2px; display: inline-block; margin: 10px 0;">
              {otp}
            </div>
            <p style="font-size: 14px; color: #6c757d;">
              This code will expire in 5 minutes.
            </p>
            <p>Thanks,<br>The {store_name} Team</p>
            <p style="font-size: 12px; color: #6c757d; margin-top: 10px;">
              Powered by {company_name}
            </p>
          </div>
          <p style="font-size: 12px; color: #6c757d; text-align: center; margin-top: 20px;">
            If you didn't request this code, please ignore this email.
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

async def send_generic_email(to_email: str, subject: str, html_content: str):
    sender_email = config.SMTP_SENDER_EMAIL
    password = config.SMTP_PASSWORD
    smtp_server = config.SMTP_SERVER
    smtp_port = int(config.SMTP_PORT) if config.SMTP_PORT else None

    if not all([sender_email, password, smtp_server, smtp_port]):
        logger.error("SMTP settings are not configured. Cannot send email.")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = sender_email
    message["To"] = to_email

    part = MIMEText(html_content, "html")
    message.attach(part)

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls(context=context)
            server.login(sender_email, password)
            server.sendmail(sender_email, to_email, message.as_string())
        logger.info(f"Generic email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send generic email to {to_email}: {e}", exc_info=True)
        raise