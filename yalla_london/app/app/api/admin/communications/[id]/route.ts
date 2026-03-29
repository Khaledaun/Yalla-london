import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";
import { getDefaultSiteId } from "@/config/sites";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { id } = await params;

    const siteId =
      request.headers.get("x-site-id") ||
      request.nextUrl.searchParams.get("siteId") ||
      getDefaultSiteId();

    const conversation = await prisma.conversation.findFirst({
      where: { id, siteId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Build contact profile from conversation's contact info
    let contact: Record<string, unknown> = {
      name: conversation.contactName,
      email: conversation.contactEmail,
      phone: conversation.contactPhone,
    };

    try {
      const [lead, subscriber] = await Promise.all([
        conversation.contactEmail
          ? prisma.lead.findFirst({
              where: {
                email: conversation.contactEmail,
                site_id: siteId,
              },
            })
          : null,
        conversation.contactEmail
          ? prisma.subscriber.findFirst({
              where: {
                email: conversation.contactEmail,
                OR: [{ site_id: siteId }, { site_id: null }],
              },
            })
          : null,
      ]);

      contact = {
        ...contact,
        lead: lead || undefined,
        subscriber: subscriber || undefined,
      };
    } catch (contactErr) {
      console.warn(
        "[communications] Failed to resolve contact profile:",
        contactErr instanceof Error ? contactErr.message : String(contactErr)
      );
    }

    return NextResponse.json({
      conversation,
      messages: conversation.messages,
      contact,
    });
  } catch (err) {
    console.warn(
      "[communications] Failed to fetch conversation:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { prisma } = await import("@/lib/db");
    const { id } = await params;

    const siteId =
      request.headers.get("x-site-id") ||
      request.nextUrl.searchParams.get("siteId") ||
      getDefaultSiteId();

    const body = await request.json();
    const { message, channel } = body as {
      message: string;
      channel: string;
    };

    if (!message || !channel) {
      return NextResponse.json(
        { error: "message and channel are required" },
        { status: 400 }
      );
    }

    // Verify conversation exists and belongs to site
    const conversation = await prisma.conversation.findFirst({
      where: { id, siteId },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Attempt to send via external channel
    if (channel === "whatsapp" && conversation.contactPhone) {
      try {
        const whatsappModule = await import("@/lib/agents/channels/whatsapp");
        const adapter = whatsappModule.createWhatsAppAdapter(siteId);
        await adapter.sendResponse(conversation.contactPhone, message);
      } catch (sendErr) {
        console.warn(
          "[communications] WhatsApp send failed:",
          sendErr instanceof Error ? sendErr.message : String(sendErr)
        );
      }
    } else if (channel === "email" && conversation.contactEmail) {
      try {
        const { sendResendEmail } = await import("@/lib/email/resend-service");
        await sendResendEmail({
          to: conversation.contactEmail,
          subject: `Re: ${conversation.summary || "Your inquiry"}`,
          html: `<p>${message}</p>`,
        });
      } catch (sendErr) {
        console.warn(
          "[communications] Email send failed:",
          sendErr instanceof Error ? sendErr.message : String(sendErr)
        );
      }
    }

    // Create message record
    const createdMessage = await prisma.message.create({
      data: {
        conversationId: id,
        direction: "outbound",
        channel,
        content: message,
        contentType: "text",
        agentId: "admin",
        approved: true,
      },
    });

    // Update conversation status and last message time
    await prisma.conversation.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        status: "active",
      },
    });

    // Create interaction log entry
    try {
      await prisma.interactionLog.create({
        data: {
          siteId,
          conversationId: id,
          opportunityId: conversation.opportunityId || undefined,
          leadId: conversation.leadId || undefined,
          channel,
          direction: "outbound",
          interactionType: "message",
          summary: message.substring(0, 500),
          agentId: "admin",
        },
      });
    } catch (logErr) {
      console.warn(
        "[communications] Failed to create interaction log:",
        logErr instanceof Error ? logErr.message : String(logErr)
      );
    }

    return NextResponse.json({
      success: true,
      message: createdMessage,
    });
  } catch (err) {
    console.warn(
      "[communications] Failed to send reply:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
}
