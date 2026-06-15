export function generateEmailTemplate(
  title: string,
  message: string,
  actionValue?: string,
): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      <div style="background-color: #4A90E2; color: white; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">${title}</h1>
      </div>
      <div style="padding: 40px; line-height: 1.6; color: #333; background-color: #ffffff;">
        <p style="font-size: 16px; margin-bottom: 25px;">${message}</p>
        ${
          actionValue
            ? `
          <div style="margin: 30px 0; text-align: center;">
            <div style="display: inline-block; background-color: #f8f9fa; padding: 20px 40px; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #4A90E2; border-radius: 8px; border: 2px dashed #4A90E2;">
              ${actionValue}
            </div>
          </div>
        `
            : ""
        }
        <p style="font-size: 14px; color: #888; margin-top: 30px; text-align: center;">If you did not request this email, please ignore it or contact support.</p>
      </div>
      <div style="background-color: #f4f4f4; color: #999; padding: 20px; text-align: center; font-size: 12px; border-top: 1px solid #eee;">
        &copy; ${new Date().getFullYear()} Your Service Name. All rights reserved.
      </div>
    </div>
  `;
}
