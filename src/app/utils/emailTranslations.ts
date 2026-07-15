// emailTranslations.ts
// Central place for all Frafol transactional email copy.
// English is used in development, Slovak in production.
// Usage: const t = getEmailStrings(); const s = t.otp;

export type EmailLang = "en" | "sk";

export const getEmailLang = (): EmailLang =>
  process.env.NODE_ENV === "production" ? "sk" : "en";

export const emailStrings = {
  en: {
    otp: {
      subjectFallback: "Your OTP Code",
      headerTitle: "One-Time Password (OTP)",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro:
        "Use the following One-Time Password (OTP) to complete your verification. This code is valid for a limited time.",
      codeLabel: "Your OTP Code",
      expiryLabel: "This OTP will expire on:",
      helpText: (supportEmail: string) =>
        `If you didn't request this code or need assistance, please contact our support team at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
    },
    welcome: {
      headerTitle: "Welcome to Frafol 🎉",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      welcomeLine: "Welcome to <strong>Frafol</strong>!",
      professionalPending:
        "Your account has been successfully created. Our admin team is currently reviewing your profile.",
      verificationBoxTitle: "Profile Verification in Progress",
      verificationBoxText:
        "Your profile is being verified by our team. You will receive a confirmation email once the verification is complete.",
      professionalVerified:
        "Your profile has been verified! You can now start receiving booking requests.",
      clientCreated:
        "Your account has been successfully created. We're excited to have you on board.",
      reviewHowItWorks: "To get started, please review how our platform works:",
      howItWorksBtn: "How It Works",
      helpText: (supportEmail: string) =>
        `If you have any questions, feel free to contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Best regards,",
    },
    profileVerified: {
      headerTitle: "Profile Verified ✅",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro:
        "Great news! Your <strong>Frafol professional profile has been successfully verified</strong> by our administration team.",
      activeBoxTitle: "Your account is now active",
      activeBoxText: "You can now complete your profile and start receiving requests.",
      nextStep:
        "<strong>Next step:</strong> Upload your portfolio so clients can see your work and contact you.",
      ctaBtn: "Upload Your Portfolio",
      helperText:
        "A complete profile with portfolio images and details helps you get more visibility and bookings.",
      helpText: (supportEmail: string) =>
        `Need help? Contact us anytime at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    bookingNotification: {
      headerTitle: "New Booking Request",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: "You have received a new booking request on <strong>Frafol</strong>. Please review the details below.",
      detailsLabel: "Booking Details",
      footerText: "Log in to your Frafol account to review and respond to this request.",
      ctaBtn: "View Booking Request",
      helpText: (supportEmail: string) =>
        `If you have any questions, please contact our support team at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    bookingDecline: {
      headerTitle: "Booking Request Declined",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro:
        "We're sorry to inform you that your booking request on <strong>Frafol</strong> has been declined. Please see the details below.",
      detailsLabel: "Decline Details",
      footerText: "Log in to your Frafol account to view more details or explore other options.",
      ctaBtn: "View Dashboard",
      helpText: (supportEmail: string) =>
        `If you have any questions, please contact our support team at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    frafolChoice: {
      subject: "Frafol Choice Activated – Order Confirmation",
      headerTitle: "Frafol Choice Activated 🎉",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro:
        "Your <strong>Frafol Choice</strong> subscription has been <strong>successfully activated</strong>. Your profile now gets higher visibility and priority placement.",
      benefitsTitle: "Your Frafol Choice Benefits:",
      benefits: [
        "Highlighted profile for higher visibility",
        "Higher ranking in client search results",
        "Featured visibility on the Frafol homepage",
        "Frafol Choice badge displayed on your profile",
        "Priority placement over standard profiles",
      ],
      orderDetailsTitle: "Order Details",
      labels: {
        orderId: "Order ID",
        plan: "Plan",
        duration: "Duration",
        days: "days",
        amountPaid: "Amount Paid",
        purchaseDate: "Purchase Date",
        validUntil: "Valid Until",
      },
      invoiceNote: "This email serves as your invoice / payment confirmation. Please keep it for your records.",
      questions: (supportEmail: string) =>
        `Questions? Contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    frafolChoiceRenewalSuccess: {
      subject: "Frafol Choice Renewed – Payment Confirmation",
      headerTitle: "Frafol Choice Renewed ✅",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro:
        "Your <strong>Frafol Choice</strong> subscription has been <strong>successfully renewed</strong>. Your benefits continue without interruption.",
      labels: {
        orderId: "Order ID",
        plan: "Plan",
        duration: "Duration",
        days: "days",
        amountPaid: "Amount Paid",
        renewalDate: "Renewal Date",
        validUntil: "Valid Until",
      },
      invoiceNote:
        "This email serves as your invoice / payment confirmation for the renewal. Please keep it for your records.",
      questions: (supportEmail: string) =>
        `Questions? <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>`,
      closing: "Kind regards,",
    },
    frafolChoiceRenewalFailed: {
      subject: "Frafol Choice – Payment Failed, Please Update Your Payment Method",
      headerTitle: "Payment Failed",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: "We were unable to process the renewal payment for your <strong>Frafol Choice</strong> subscription.",
      actionRequired: "Action Required:",
      actionText: "Please try a different payment method to avoid losing your Frafol Choice benefits.",
      remainsActiveUntil: (date: string) => `Your current subscription remains active until <strong>${date}</strong>.`,
      ctaBtn: "Update Payment Method",
      helpText: (supportEmail: string) =>
        `If you need help, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    frafolChoiceExpiringSoon: {
      subject: (daysLeft: number) => `Your Frafol Choice Expires in ${daysLeft} Day${daysLeft !== 1 ? "s" : ""} – Renew Now`,
      headerTitle: "Your Frafol Choice Expires Soon",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (daysLeft: number, expiryDate: string) =>
        `Your <strong>Frafol Choice</strong> subscription is expiring in <strong>${daysLeft} day${
          daysLeft !== 1 ? "s" : ""
        }</strong> on <strong>${expiryDate}</strong>.`,
      warningTitle: "Don't lose your perks!",
      warningText: "Renew now to keep your highlighted profile, priority ranking, and Frafol Choice badge.",
      ctaBtn: "Renew Frafol Choice",
      questions: (supportEmail: string) =>
        `Questions? <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>`,
      closing: "Kind regards,",
    },
    frafolChoiceExpired: {
      subject: "Your Frafol Choice Has Expired – Renew to Restore Your Benefits",
      headerTitle: "Frafol Choice Has Expired",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro:
        "Your <strong>Frafol Choice</strong> subscription has expired. Your profile has returned to standard visibility.",
      lostAccessTitle: "You have lost access to:",
      lostAccessItems: [
        "Highlighted profile &amp; priority ranking",
        "Featured visibility on the Frafol homepage",
        "Frafol Choice badge on your profile",
      ],
      renewText: "Renew your Frafol Choice to regain these benefits and stay ahead of the competition.",
      ctaBtn: "Renew Frafol Choice",
      questions: (supportEmail: string) =>
        `Questions? <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>`,
      closing: "Kind regards,",
    },
    profileDeclined: {
      subject: "Profile Verification Declined",
      headerTitle: "Profile Verification Update",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro:
        "Thank you for submitting your professional profile on <strong>Frafol</strong>. After careful review, we regret to inform you that your profile verification has not been approved at this time.",
      reasonLabel: "Reason for Decline:",
      helpText: (supportEmail: string) =>
        `If you believe this is an error or would like to provide additional information, please contact our support team at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Best regards,",
    },
    passwordChanged: {
      subject: "Your Password Has Been Changed",
      headerTitle: "Password Changed",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      body: "Your account password has been successfully changed.",
      warning: (supportEmail: string) =>
        `If you did not make this change, please contact us immediately at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Best regards,",
    },
    forgotPassword: {
      subject: "Your Password Has Been Reset",
      headerTitle: "Password Reset Successful",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      body: "Your password has been reset successfully. You can now log in with your new password.",
      warning: (supportEmail: string) =>
        `If you did not request this reset, please contact us immediately at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Best regards,",
    },
    bankDetailsChanged: {
      subject: "Bank Account Details Changed",
      headerTitle: "Bank Account Updated",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      body: "Your bank account details on <strong>Frafol</strong> have been successfully updated.",
      warning: (supportEmail: string) =>
        `If you did not make this change, please contact us immediately at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Best regards,",
    },
    accountBlocked: {
      subject: (isDeleted: boolean) => `Your Frafol Account Has Been ${isDeleted ? "Deleted" : "Blocked"}`,
      headerTitle: (isDeleted: boolean) => (isDeleted ? "Account Deleted" : "Account Blocked"),
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      body: (action: string) => `Your Frafol account has been <strong>${action}</strong> by our admin team.`,
      actionDeleted: "deleted",
      actionBlocked: "blocked",
      reasonLabel: "Reason:",
      helpText: (supportEmail: string) =>
        `If you believe this is a mistake, please reach out to us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Best regards,",
    },
    commentOrReply: {
      subjectComment: "New Comment on Your Post",
      subjectReply: "New Reply on Your Post",
      actionCommented: "commented on",
      actionReplied: "replied to a comment on",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      body: (actorName: string, action: string, title: string) =>
        `<strong>${actorName}</strong> ${action} your post <strong>"${title}"</strong>.`,
      ctaBtn: "View Post",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    bookingRequest: {
      headerTitle: (bookingType: string) => `New ${bookingType} Request`,
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (bookingTypeLower: string, senderName: string, orderLabel: string) =>
        `You have received a new <strong>${bookingTypeLower} request</strong> from <strong>${senderName}</strong> for ${orderLabel}.`,
      actionRequiredLabel: "Action required:",
      actionRequiredText: "Please review this request and accept or decline it from your dashboard.",
      ctaBtn: "Review Request",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
      directBookingLabel: "Direct Booking",
      customBookingLabel: (serviceType: string) => `Custom ${serviceType} Booking`,
      aPackage: "a package",
      customService: "service",
    },
    orderAccepted: {
      subject: "Your Booking Has Been Accepted – Complete Payment",
      headerTitle: "Booking Accepted",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (providerName: string, orderLabel: string) =>
        `Great news! <strong>${providerName}</strong> has <strong>accepted</strong> your booking request for <strong>${orderLabel}</strong>.`,
      nextStepLabel: "Next step:",
      nextStepText: "Please complete your payment to confirm the booking.",
      ctaBtn: "Complete Payment",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
      yourPackage: "your package",
      customBooking: (serviceType: string) => `custom ${serviceType}`,
    },
    paymentSuccess: {
      subject: "Payment Received – Your Order Is Now In Progress",
      headerTitle: "Payment Received – Order In Progress",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (clientName: string, orderLabel: string) =>
        `<strong>${clientName}</strong> has successfully completed payment for <strong>${orderLabel}</strong>. The order is now in progress.`,
      confirmedLabel: "Payment confirmed.",
      confirmedText: "You can now start working on the order.",
      ctaBtn: "View Order",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
      yourPackage: "your package",
      customBooking: (serviceType: string) => `custom ${serviceType}`,
    },
    newMessage: {
      subject: (senderName: string) => `New Message from ${senderName}`,
      headerTitle: "New Message",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (senderName: string) => `You have received a new message from <strong>${senderName}</strong>.`,
      ctaBtn: "Reply to Message",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    deliveryAccepted: {
      subject: "Your Delivery Has Been Accepted",
      headerTitle: "Delivery Accepted ✅",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (clientName: string, serviceLabel: string) =>
        `Great news! <strong>${clientName}</strong> has <strong>accepted your delivery</strong> for the <strong>${serviceLabel}</strong>.`,
      completedText: "The order has been successfully completed. Well done!",
      ctaBtn: "View Order",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
      order: "order",
    },
    cancelRequestDeclined: {
      subject: "Your Cancellation Request Has Been Declined",
      headerTitle: "Cancellation Request Declined",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (declinedByName: string, serviceLabel: string) =>
        `<strong>${declinedByName}</strong> has <strong>declined</strong> your cancellation request for the <strong>${serviceLabel}</strong>. The order will continue as previously agreed.`,
      reasonLabel: "Reason for decline:",
      ctaBtn: "View Order",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
      order: "order",
    },
    cancelRequest: {
      subject: "Cancellation Request – Action Required",
      headerTitle: "Cancellation Request Received",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (requesterName: string, serviceLabel: string) =>
        `<strong>${requesterName}</strong> has requested to cancel the <strong>${serviceLabel}</strong>. Please review this request and take action.`,
      reasonLabel: "Reason provided:",
      ctaBtn: "Review Request",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
      order: "order",
    },
    refundRequired: {
      subject: "Refund Required – Order Cancelled",
      headerTitle: "Refund Required – Order Cancelled",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro:
        "An order has been cancelled and may require a <strong>refund</strong>. Please review the details below and take the necessary action.",
      labels: {
        orderId: "Order ID",
        cancelledBy: "Cancelled By",
        serviceType: "Service Type",
      },
      ctaBtn: "Review Order",
      helpText: (supportEmail: string) =>
        `If you have any questions, please contact our support team at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
      teamName: "Frafol System",
    },
    deliveryRequest: {
      subject: "Delivery Request Received – Action Required",
      headerTitle: "Delivery Request Received",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (senderName: string, orderLabel: string) =>
        `<strong>${senderName}</strong> has submitted a delivery for <strong>${orderLabel}</strong>. Please review and confirm.`,
      actionRequiredLabel: "Action required:",
      actionRequiredText: "Please review the delivery and confirm or decline it from your dashboard.",
      ctaBtn: "Review Delivery",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
      yourOrder: "your order",
      customBooking: (serviceType: string) => `custom ${serviceType}`,
    },
    extensionRequest: {
      subject: "Delivery Date Extension Requested",
      headerTitle: "Delivery Date Extension Requested",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (senderName: string, serviceLabel: string) =>
        `<strong>${senderName}</strong> has requested a delivery date extension for the <strong>${serviceLabel}</strong>.`,
      reasonLabel: "Reason:",
      ctaBtn: "Review Request",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
      order: "order",
    },
    extensionAccepted: {
      subject: "Delivery Date Extension Accepted",
      headerTitle: "Extension Request Accepted",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (senderName: string, serviceLabel: string) =>
        `<strong>${senderName}</strong> has accepted your delivery date extension request for the <strong>${serviceLabel}</strong>.`,
      newDateLabel: "New delivery date:",
      ctaBtn: "View Order",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
      order: "order",
      newAgreedDate: "the new agreed date",
    },
    extensionRejected: {
      subject: "Delivery Date Extension Rejected",
      headerTitle: "Extension Request Rejected",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (senderName: string, serviceLabel: string) =>
        `<strong>${senderName}</strong> has rejected your delivery date extension request for the <strong>${serviceLabel}</strong>.`,
      reasonLabel: "Reason:",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
      order: "order",
    },
    orderDeclined: {
      subjectDelivery: "Delivery Request Declined",
      subjectOrder: "Order Request Declined",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      bodyDelivery: (senderName: string, orderLabel: string) =>
        `<strong>${senderName}</strong> has declined the delivery request for your <strong>${orderLabel}</strong>. You can revise and resubmit the delivery from your dashboard.`,
      bodyOrder: (senderName: string, orderLabel: string) =>
        `<strong>${senderName}</strong> has declined your <strong>${orderLabel}</strong> request.`,
      reasonLabel: "Reason:",
      defaultDeliveryNote: "Please review the feedback and update your delivery before resubmitting.",
      defaultOrderNote: "If you have questions or believe this was a mistake, please contact us.",
      ctaBtn: "Go to Dashboard",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
      order: "order",
      customBooking: (serviceType: string) => `custom ${serviceType}`,
    },
    orderCancelled: {
      subject: (orderLabel: string) => `Order Cancelled: ${orderLabel}`,
      headerTitle: "Order Cancelled",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (senderName: string, orderLabel: string) =>
        `<strong>${senderName}</strong> has cancelled the <strong>${orderLabel}</strong>.`,
      note: "If you have any questions about this cancellation, please contact us.",
      ctaBtn: "Go to Dashboard",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
      order: "order",
      customBooking: (serviceType: string) => `custom ${serviceType}`,
    },
    gearApproved: {
      subject: (itemName: string) => `Gear Item Approved: "${itemName}"`,
      headerTitle: "Gear Item Approved!",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (itemName: string) =>
        `Congratulations! Your gear item <strong>"${itemName}"</strong> has been approved by our admin team and is now live on the Frafol marketplace.`,
      note: "Your item is now visible to buyers and ready to receive orders.",
      ctaBtn: "View Your Listing",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    gearDeclined: {
      subject: (itemName: string) => `Gear Item Declined: "${itemName}"`,
      headerTitle: "Gear Item Declined",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (itemName: string) =>
        `We're sorry to inform you that your gear item <strong>"${itemName}"</strong> has been declined by our admin team.`,
      reasonLabel: "Reason:",
      defaultNote: "Please review our listing guidelines and resubmit if appropriate.",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    workshopDeclined: {
      subject: (title: string) => `Workshop Declined: "${title}"`,
      headerTitle: "Workshop Declined",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (title: string) =>
        `We're sorry to inform you that your workshop <strong>"${title}"</strong> has been declined by our admin team.`,
      reasonLabel: "Reason:",
      helpText: (supportEmail: string) =>
        `If you believe this decision was made in error or have any questions, please contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    workshopApproved: {
      subject: (title: string) => `Workshop Approved: "${title}"`,
      headerTitle: "Workshop Approved!",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (title: string) =>
        `Congratulations! Your workshop <strong>"${title}"</strong> has been approved by our admin team and is now live on Frafol.`,
      note: "Your workshop is now visible to participants and ready to accept bookings.",
      ctaBtn: "View Your Workshop",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    packageApproved: {
      subject: (title: string) => `Package Approved: "${title}"`,
      headerTitle: "Package Approved!",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (title: string) =>
        `Congratulations! Your package <strong>"${title}"</strong> has been approved by our admin team and is now live on Frafol.`,
      note: "Your package is now visible to clients and ready to accept bookings.",
      ctaBtn: "View Your Package",
      helpText: (supportEmail: string) =>
        `If you have any questions, contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    packageDeclined: {
      subject: (title: string) => `Package Declined: "${title}"`,
      headerTitle: "Package Declined",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: (title: string) =>
        `We're sorry to inform you that your package <strong>"${title}"</strong> has been declined by our admin team.`,
      reasonLabel: "Reason:",
      helpText: (supportEmail: string) =>
        `If you believe this decision was made in error or have any questions, please contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    eventInvoice: {
      subject: (orderId: string) => `Invoice – Order ${orderId} | Frafol`,
      headerTitle: "Payment Confirmation & Invoice",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: "Your payment has been successfully processed. Please find your invoice below.",
      labels: {
        invoiceOrderId: "Invoice / Order ID",
        transactionId: "Transaction ID",
        paymentDate: "Payment Date",
        paymentMethod: "Payment Method",
        billTo: "Bill To",
        name: "Name",
        address: "Address",
        company: "Company",
        ico: "ICO",
        dic: "DIC",
        icDph: "IC DPH",
        orderDetails: "Order Details",
        orderType: "Order Type",
        serviceType: "Service Type",
        serviceProvider: "Service Provider",
        eventDate: "Event Date",
        location: "Location",
        priceBreakdown: "Price Breakdown",
        basePrice: "Base Price",
        serviceFee: "Service Fee",
        vat: "VAT",
        couponDiscount: "Coupon Discount",
        totalPaid: "Total Paid",
      },
      directBooking: "Direct Booking",
      customBooking: (serviceType: string) => `Custom ${serviceType} Booking`,
      invoiceNote: "This email serves as your official invoice. Please keep it for your records.",
      questions: (supportEmail: string) =>
        `Questions? Contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    workshopInvoice: {
      subject: (title: string) => `Workshop Invoice – ${title} | Frafol`,
      headerTitle: "Workshop Registration Invoice",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: "Your workshop registration is confirmed. Here is your invoice.",
      labels: {
        orderId: "Order ID",
        transactionId: "Transaction ID",
        paymentDate: "Payment Date",
        billTo: "Bill To",
        name: "Name",
        address: "Address",
        company: "Company",
        ico: "ICO",
        dic: "DIC",
        icDph: "IC DPH",
        workshopDetails: "Workshop Details",
        workshop: "Workshop",
        instructor: "Instructor",
        dateAndTime: "Date & Time",
        format: "Format",
        locationOrLink: "Location / Link",
        priceBreakdown: "Price Breakdown",
        basePrice: "Base Price",
        vat: "VAT",
        totalPaid: "Total Paid",
      },
      inPerson: "In-person",
      invoiceNote: "This email serves as your official invoice. Please keep it for your records.",
      questions: (supportEmail: string) =>
        `Questions? Contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    gearInvoice: {
      subject: (count: number) => `Marketplace Invoice – ${count} Item${count !== 1 ? "s" : ""} | Frafol`,
      headerTitle: "Marketplace Order Invoice",
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: "Your marketplace purchase is confirmed. Here is your invoice.",
      labels: {
        transactionId: "Transaction ID",
        paymentDate: "Payment Date",
        itemsPurchased: "Items Purchased",
        shipTo: "Ship To",
        name: "Name",
        address: "Address",
        company: "Company",
        ico: "ICO",
        dic: "DIC",
        icDph: "IC DPH",
        itemsOrdered: "Items Ordered",
        item: "Item",
        base: "Base",
        vat: "VAT",
        shipping: "Shipping",
        total: "Total",
        order: "Order",
        condition: "Condition",
        itemsSubtotal: "Items Subtotal",
        totalShipping: "Total Shipping",
        totalPaid: "Total Paid",
      },
      invoiceNote: "This email serves as your official invoice. Please keep it for your records.",
      questions: (supportEmail: string) =>
        `Questions? Contact us at <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "Kind regards,",
    },
    common: {
      teamSignature: "Frafol Team",
      policiesIntro: "Please review our policies:",
      termsMarketplace: "Terms & Conditions (Marketplace)",
      termsConceptual: "Terms & Conditions (Conceptual)",
      gdprPolicy: "GDPR & Data Protection Policy",
      footerRights: (year: number) => `© ${year} Frafol. All rights reserved.`,
    },
  },
  sk: {
    otp: {
      subjectFallback: "Váš OTP kód",
      headerTitle: "Jednorazové heslo (OTP)",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro:
        "Na dokončenie overenia použite nasledujúce jednorazové heslo (OTP). Tento kód je platný len obmedzený čas.",
      codeLabel: "Váš OTP kód",
      expiryLabel: "Platnosť tohto OTP kódu vyprší:",
      helpText: (supportEmail: string) =>
        `Ak ste o tento kód nežiadali alebo potrebujete pomoc, kontaktujte náš tím podpory na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
    },
    welcome: {
      headerTitle: "Vitajte na Frafol 🎉",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      welcomeLine: "Vitajte na <strong>Frafol</strong>!",
      professionalPending:
        "Váš účet bol úspešne vytvorený. Náš administratívny tím momentálne kontroluje váš profil.",
      verificationBoxTitle: "Prebieha overovanie profilu",
      verificationBoxText:
        "Váš profil overuje náš tím. Po dokončení overenia dostanete potvrdzujúci e-mail.",
      professionalVerified:
        "Váš profil bol overený! Teraz môžete začať prijímať žiadosti o rezerváciu.",
      clientCreated: "Váš účet bol úspešne vytvorený. Tešíme sa, že ste sa k nám pripojili.",
      reviewHowItWorks: "Ak chcete začať, prečítajte si, ako naša platforma funguje:",
      howItWorksBtn: "Ako to funguje",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, neváhajte nás kontaktovať na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    profileVerified: {
      headerTitle: "Profil overený ✅",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro:
        "Dobrá správa! Váš <strong>profesionálny profil na Frafol bol úspešne overený</strong> naším administratívnym tímom.",
      activeBoxTitle: "Váš účet je teraz aktívny",
      activeBoxText: "Teraz môžete dokončiť svoj profil a začať prijímať požiadavky.",
      nextStep:
        "<strong>Ďalší krok:</strong> Nahrajte svoje portfólio, aby klienti videli vašu prácu a mohli vás kontaktovať.",
      ctaBtn: "Nahrať portfólio",
      helperText:
        "Kompletný profil s obrázkami portfólia a detailmi vám pomôže získať väčšiu viditeľnosť a viac rezervácií.",
      helpText: (supportEmail: string) =>
        `Potrebujete pomoc? Kontaktujte nás kedykoľvek na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    bookingNotification: {
      headerTitle: "Nová žiadosť o rezerváciu",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: "Dostali ste novú žiadosť o rezerváciu na <strong>Frafol</strong>. Skontrolujte prosím detaily nižšie.",
      detailsLabel: "Detaily rezervácie",
      footerText: "Prihláste sa do svojho účtu Frafol, aby ste túto žiadosť skontrolovali a odpovedali na ňu.",
      ctaBtn: "Zobraziť žiadosť o rezerváciu",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte náš tím podpory na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    bookingDecline: {
      headerTitle: "Žiadosť o rezerváciu bola zamietnutá",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro:
        "S ľútosťou vám oznamujeme, že vaša žiadosť o rezerváciu na <strong>Frafol</strong> bola zamietnutá. Detaily nájdete nižšie.",
      detailsLabel: "Detaily zamietnutia",
      footerText: "Prihláste sa do svojho účtu Frafol, kde nájdete ďalšie informácie alebo iné možnosti.",
      ctaBtn: "Zobraziť nástenku",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte náš tím podpory na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    frafolChoice: {
      subject: "Frafol Choice aktivovaný – Potvrdenie objednávky",
      headerTitle: "Frafol Choice aktivovaný 🎉",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro:
        "Vaše predplatné <strong>Frafol Choice</strong> bolo <strong>úspešne aktivované</strong>. Váš profil teraz získava vyššiu viditeľnosť a prioritné umiestnenie.",
      benefitsTitle: "Vaše výhody Frafol Choice:",
      benefits: [
        "Zvýraznený profil pre vyššiu viditeľnosť",
        "Vyššie umiestnenie vo výsledkoch vyhľadávania klientov",
        "Zvýraznená viditeľnosť na hlavnej stránke Frafol",
        "Odznak Frafol Choice zobrazený na vašom profile",
        "Prioritné umiestnenie pred štandardnými profilmi",
      ],
      orderDetailsTitle: "Detaily objednávky",
      labels: {
        orderId: "Číslo objednávky",
        plan: "Plán",
        duration: "Trvanie",
        days: "dní",
        amountPaid: "Zaplatená suma",
        purchaseDate: "Dátum nákupu",
        validUntil: "Platnosť do",
      },
      invoiceNote: "Tento e-mail slúži ako vaša faktúra / potvrdenie platby. Uschovajte si ho pre svoje záznamy.",
      questions: (supportEmail: string) =>
        `Máte otázky? Kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    frafolChoiceRenewalSuccess: {
      subject: "Frafol Choice obnovený – Potvrdenie platby",
      headerTitle: "Frafol Choice obnovený ✅",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro:
        "Vaše predplatné <strong>Frafol Choice</strong> bolo <strong>úspešne obnovené</strong>. Vaše výhody pokračujú bez prerušenia.",
      labels: {
        orderId: "Číslo objednávky",
        plan: "Plán",
        duration: "Trvanie",
        days: "dní",
        amountPaid: "Zaplatená suma",
        renewalDate: "Dátum obnovenia",
        validUntil: "Platnosť do",
      },
      invoiceNote:
        "Tento e-mail slúži ako vaša faktúra / potvrdenie platby za obnovenie. Uschovajte si ho pre svoje záznamy.",
      questions: (supportEmail: string) =>
        `Máte otázky? <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>`,
      closing: "S pozdravom,",
    },
    frafolChoiceRenewalFailed: {
      subject: "Frafol Choice – Platba zlyhala, aktualizujte spôsob platby",
      headerTitle: "Platba zlyhala",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: "Nepodarilo sa nám spracovať platbu za obnovenie vášho predplatného <strong>Frafol Choice</strong>.",
      actionRequired: "Vyžaduje sa akcia:",
      actionText: "Skúste prosím iný spôsob platby, aby ste neprišli o výhody Frafol Choice.",
      remainsActiveUntil: (date: string) =>
        `Vaše aktuálne predplatné zostáva aktívne do <strong>${date}</strong>.`,
      ctaBtn: "Aktualizovať spôsob platby",
      helpText: (supportEmail: string) =>
        `Ak potrebujete pomoc, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    frafolChoiceExpiringSoon: {
      subject: (daysLeft: number) => `Vaše Frafol Choice vyprší o ${daysLeft} deň${daysLeft !== 1 ? "(dní)" : ""} – obnovte teraz`,
      headerTitle: "Vaše Frafol Choice čoskoro vyprší",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (daysLeft: number, expiryDate: string) =>
        `Vaše predplatné <strong>Frafol Choice</strong> vyprší o <strong>${daysLeft} deň${
          daysLeft !== 1 ? "(dní)" : ""
        }</strong>, dňa <strong>${expiryDate}</strong>.`,
      warningTitle: "Neprichádzajte o svoje výhody!",
      warningText: "Obnovte si predplatné teraz a zachovajte si zvýraznený profil, prioritné umiestnenie a odznak Frafol Choice.",
      ctaBtn: "Obnoviť Frafol Choice",
      questions: (supportEmail: string) =>
        `Máte otázky? <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>`,
      closing: "S pozdravom,",
    },
    frafolChoiceExpired: {
      subject: "Vaše Frafol Choice vypršalo – obnovte a získajte výhody späť",
      headerTitle: "Frafol Choice vypršalo",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: "Vaše predplatné <strong>Frafol Choice</strong> vypršalo. Váš profil sa vrátil na štandardnú viditeľnosť.",
      lostAccessTitle: "Prišli ste o prístup k:",
      lostAccessItems: [
        "Zvýraznenému profilu a prioritnému umiestneniu",
        "Zvýraznenej viditeľnosti na hlavnej stránke Frafol",
        "Odznaku Frafol Choice na vašom profile",
      ],
      renewText: "Obnovte si Frafol Choice, aby ste tieto výhody získali späť a udržali si náskok pred konkurenciou.",
      ctaBtn: "Obnoviť Frafol Choice",
      questions: (supportEmail: string) =>
        `Máte otázky? <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>`,
      closing: "S pozdravom,",
    },
    profileDeclined: {
      subject: "Overenie profilu zamietnuté",
      headerTitle: "Aktualizácia overenia profilu",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro:
        "Ďakujeme za odoslanie vášho profesionálneho profilu na <strong>Frafol</strong>. Po dôkladnom preskúmaní vám s ľútosťou oznamujeme, že overenie vášho profilu nebolo v tejto chvíli schválené.",
      reasonLabel: "Dôvod zamietnutia:",
      helpText: (supportEmail: string) =>
        `Ak si myslíte, že ide o chybu, alebo chcete poskytnúť ďalšie informácie, kontaktujte náš tím podpory na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    passwordChanged: {
      subject: "Vaše heslo bolo zmenené",
      headerTitle: "Heslo zmenené",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      body: "Heslo k vášmu účtu bolo úspešne zmenené.",
      warning: (supportEmail: string) =>
        `Ak ste túto zmenu nevykonali vy, okamžite nás kontaktujte na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    forgotPassword: {
      subject: "Vaše heslo bolo obnovené",
      headerTitle: "Obnovenie hesla úspešné",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      body: "Vaše heslo bolo úspešne obnovené. Teraz sa môžete prihlásiť s novým heslom.",
      warning: (supportEmail: string) =>
        `Ak ste o toto obnovenie nežiadali, okamžite nás kontaktujte na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    bankDetailsChanged: {
      subject: "Bankové údaje boli zmenené",
      headerTitle: "Bankový účet aktualizovaný",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      body: "Vaše bankové údaje na <strong>Frafol</strong> boli úspešne aktualizované.",
      warning: (supportEmail: string) =>
        `Ak ste túto zmenu nevykonali vy, okamžite nás kontaktujte na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    accountBlocked: {
      subject: (isDeleted: boolean) => `Váš účet Frafol bol ${isDeleted ? "vymazaný" : "zablokovaný"}`,
      headerTitle: (isDeleted: boolean) => (isDeleted ? "Účet vymazaný" : "Účet zablokovaný"),
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      body: (action: string) => `Váš účet Frafol bol našim administratívnym tímom <strong>${action}</strong>.`,
      actionDeleted: "vymazaný",
      actionBlocked: "zablokovaný",
      reasonLabel: "Dôvod:",
      helpText: (supportEmail: string) =>
        `Ak si myslíte, že ide o omyl, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    commentOrReply: {
      subjectComment: "Nový komentár k vášmu príspevku",
      subjectReply: "Nová odpoveď na váš príspevok",
      actionCommented: "okomentoval(a)",
      actionReplied: "odpovedal(a) na komentár k",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      body: (actorName: string, action: string, title: string) =>
        `<strong>${actorName}</strong> ${action} váš príspevok <strong>„${title}"</strong>.`,
      ctaBtn: "Zobraziť príspevok",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    bookingRequest: {
      headerTitle: (bookingType: string) => `Nová žiadosť – ${bookingType}`,
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (bookingTypeLower: string, senderName: string, orderLabel: string) =>
        `Dostali ste novú žiadosť o <strong>${bookingTypeLower}</strong> od <strong>${senderName}</strong> na ${orderLabel}.`,
      actionRequiredLabel: "Vyžaduje sa akcia:",
      actionRequiredText: "Skontrolujte túto žiadosť a prijmite ju alebo zamietnite vo svojej nástenke.",
      ctaBtn: "Skontrolovať žiadosť",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
      directBookingLabel: "priamu rezerváciu",
      customBookingLabel: (serviceType: string) => `individuálnu rezerváciu – ${serviceType}`,
      aPackage: "balík",
      customService: "službu",
    },
    orderAccepted: {
      subject: "Vaša rezervácia bola prijatá – dokončite platbu",
      headerTitle: "Rezervácia prijatá",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (providerName: string, orderLabel: string) =>
        `Dobrá správa! <strong>${providerName}</strong> <strong>prijal(a)</strong> vašu žiadosť o rezerváciu na <strong>${orderLabel}</strong>.`,
      nextStepLabel: "Ďalší krok:",
      nextStepText: "Dokončite prosím platbu, aby ste potvrdili rezerváciu.",
      ctaBtn: "Dokončiť platbu",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
      yourPackage: "váš balík",
      customBooking: (serviceType: string) => `individuálnu rezerváciu – ${serviceType}`,
    },
    paymentSuccess: {
      subject: "Platba prijatá – vaša objednávka sa spracováva",
      headerTitle: "Platba prijatá – objednávka sa spracováva",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (clientName: string, orderLabel: string) =>
        `<strong>${clientName}</strong> úspešne dokončil(a) platbu za <strong>${orderLabel}</strong>. Objednávka sa teraz spracováva.`,
      confirmedLabel: "Platba potvrdená.",
      confirmedText: "Teraz môžete začať pracovať na objednávke.",
      ctaBtn: "Zobraziť objednávku",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
      yourPackage: "váš balík",
      customBooking: (serviceType: string) => `individuálnu rezerváciu – ${serviceType}`,
    },
    newMessage: {
      subject: (senderName: string) => `Nová správa od ${senderName}`,
      headerTitle: "Nová správa",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (senderName: string) => `Dostali ste novú správu od <strong>${senderName}</strong>.`,
      ctaBtn: "Odpovedať na správu",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    deliveryAccepted: {
      subject: "Vaše dodanie bolo prijaté",
      headerTitle: "Dodanie prijaté ✅",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (clientName: string, serviceLabel: string) =>
        `Dobrá správa! <strong>${clientName}</strong> <strong>prijal(a) vaše dodanie</strong> pre <strong>${serviceLabel}</strong>.`,
      completedText: "Objednávka bola úspešne dokončená. Skvelá práca!",
      ctaBtn: "Zobraziť objednávku",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
      order: "objednávku",
    },
    cancelRequestDeclined: {
      subject: "Vaša žiadosť o zrušenie bola zamietnutá",
      headerTitle: "Žiadosť o zrušenie zamietnutá",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (declinedByName: string, serviceLabel: string) =>
        `<strong>${declinedByName}</strong> <strong>zamietol/zamietla</strong> vašu žiadosť o zrušenie pre <strong>${serviceLabel}</strong>. Objednávka bude pokračovať podľa pôvodnej dohody.`,
      reasonLabel: "Dôvod zamietnutia:",
      ctaBtn: "Zobraziť objednávku",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
      order: "objednávku",
    },
    cancelRequest: {
      subject: "Žiadosť o zrušenie – vyžaduje sa akcia",
      headerTitle: "Prijatá žiadosť o zrušenie",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (requesterName: string, serviceLabel: string) =>
        `<strong>${requesterName}</strong> požiadal(a) o zrušenie <strong>${serviceLabel}</strong>. Skontrolujte túto žiadosť a prijmite opatrenie.`,
      reasonLabel: "Uvedený dôvod:",
      ctaBtn: "Skontrolovať žiadosť",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
      order: "objednávky",
    },
    refundRequired: {
      subject: "Vyžaduje sa refundácia – objednávka zrušená",
      headerTitle: "Vyžaduje sa refundácia – objednávka zrušená",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro:
        "Objednávka bola zrušená a môže vyžadovať <strong>refundáciu</strong>. Skontrolujte prosím detaily nižšie a podniknite potrebné kroky.",
      labels: {
        orderId: "Číslo objednávky",
        cancelledBy: "Zrušil(a)",
        serviceType: "Typ služby",
      },
      ctaBtn: "Skontrolovať objednávku",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte náš tím podpory na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
      teamName: "Frafol System",
    },
    deliveryRequest: {
      subject: "Prijatá žiadosť o dodanie – vyžaduje sa akcia",
      headerTitle: "Prijatá žiadosť o dodanie",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (senderName: string, orderLabel: string) =>
        `<strong>${senderName}</strong> odoslal(a) dodanie pre <strong>${orderLabel}</strong>. Skontrolujte a potvrďte.`,
      actionRequiredLabel: "Vyžaduje sa akcia:",
      actionRequiredText: "Skontrolujte dodanie a potvrďte alebo zamietnite ho vo svojej nástenke.",
      ctaBtn: "Skontrolovať dodanie",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
      yourOrder: "vašu objednávku",
      customBooking: (serviceType: string) => `individuálnu rezerváciu – ${serviceType}`,
    },
    extensionRequest: {
      subject: "Žiadosť o predĺženie termínu dodania",
      headerTitle: "Žiadosť o predĺženie termínu dodania",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (senderName: string, serviceLabel: string) =>
        `<strong>${senderName}</strong> požiadal(a) o predĺženie termínu dodania pre <strong>${serviceLabel}</strong>.`,
      reasonLabel: "Dôvod:",
      ctaBtn: "Skontrolovať žiadosť",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
      order: "objednávku",
    },
    extensionAccepted: {
      subject: "Predĺženie termínu dodania prijaté",
      headerTitle: "Žiadosť o predĺženie prijatá",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (senderName: string, serviceLabel: string) =>
        `<strong>${senderName}</strong> prijal(a) vašu žiadosť o predĺženie termínu dodania pre <strong>${serviceLabel}</strong>.`,
      newDateLabel: "Nový termín dodania:",
      ctaBtn: "Zobraziť objednávku",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
      order: "objednávku",
      newAgreedDate: "nový dohodnutý termín",
    },
    extensionRejected: {
      subject: "Predĺženie termínu dodania zamietnuté",
      headerTitle: "Žiadosť o predĺženie zamietnutá",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (senderName: string, serviceLabel: string) =>
        `<strong>${senderName}</strong> zamietol/zamietla vašu žiadosť o predĺženie termínu dodania pre <strong>${serviceLabel}</strong>.`,
      reasonLabel: "Dôvod:",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
      order: "objednávku",
    },
    orderDeclined: {
      subjectDelivery: "Žiadosť o dodanie zamietnutá",
      subjectOrder: "Žiadosť o objednávku zamietnutá",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      bodyDelivery: (senderName: string, orderLabel: string) =>
        `<strong>${senderName}</strong> zamietol/zamietla žiadosť o dodanie pre vašu <strong>${orderLabel}</strong>. Dodanie môžete upraviť a znova odoslať vo svojej nástenke.`,
      bodyOrder: (senderName: string, orderLabel: string) =>
        `<strong>${senderName}</strong> zamietol/zamietla vašu žiadosť <strong>${orderLabel}</strong>.`,
      reasonLabel: "Dôvod:",
      defaultDeliveryNote: "Prečítajte si spätnú väzbu a pred opätovným odoslaním dodanie upravte.",
      defaultOrderNote: "Ak máte otázky alebo si myslíte, že ide o omyl, kontaktujte nás.",
      ctaBtn: "Prejsť na nástenku",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
      order: "objednávku",
      customBooking: (serviceType: string) => `individuálnu rezerváciu – ${serviceType}`,
    },
    orderCancelled: {
      subject: (orderLabel: string) => `Objednávka zrušená: ${orderLabel}`,
      headerTitle: "Objednávka zrušená",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (senderName: string, orderLabel: string) =>
        `<strong>${senderName}</strong> zrušil(a) <strong>${orderLabel}</strong>.`,
      note: "Ak máte akékoľvek otázky týkajúce sa tohto zrušenia, kontaktujte nás.",
      ctaBtn: "Prejsť na nástenku",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
      order: "objednávku",
      customBooking: (serviceType: string) => `individuálnu rezerváciu – ${serviceType}`,
    },
    gearApproved: {
      subject: (itemName: string) => `Vybavenie schválené: „${itemName}"`,
      headerTitle: "Vybavenie schválené!",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (itemName: string) =>
        `Gratulujeme! Vaše vybavenie <strong>„${itemName}"</strong> bolo schválené naším administratívnym tímom a je teraz dostupné na trhovisku Frafol.`,
      note: "Vaša položka je teraz viditeľná pre kupujúcich a pripravená prijímať objednávky.",
      ctaBtn: "Zobraziť váš inzerát",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    gearDeclined: {
      subject: (itemName: string) => `Vybavenie zamietnuté: „${itemName}"`,
      headerTitle: "Vybavenie zamietnuté",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (itemName: string) =>
        `S ľútosťou vám oznamujeme, že vaše vybavenie <strong>„${itemName}"</strong> bolo naším administratívnym tímom zamietnuté.`,
      reasonLabel: "Dôvod:",
      defaultNote: "Prečítajte si prosím pravidlá pre inzeráty a v prípade potreby znova odošlite žiadosť.",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    workshopDeclined: {
      subject: (title: string) => `Workshop zamietnutý: „${title}"`,
      headerTitle: "Workshop zamietnutý",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (title: string) =>
        `S ľútosťou vám oznamujeme, že váš workshop <strong>„${title}"</strong> bol naším administratívnym tímom zamietnutý.`,
      reasonLabel: "Dôvod:",
      helpText: (supportEmail: string) =>
        `Ak si myslíte, že toto rozhodnutie bolo omylom, alebo máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    workshopApproved: {
      subject: (title: string) => `Workshop schválený: „${title}"`,
      headerTitle: "Workshop schválený!",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (title: string) =>
        `Gratulujeme! Váš workshop <strong>„${title}"</strong> bol schválený naším administratívnym tímom a je teraz dostupný na Frafol.`,
      note: "Váš workshop je teraz viditeľný pre účastníkov a pripravený prijímať rezervácie.",
      ctaBtn: "Zobraziť váš workshop",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    packageApproved: {
      subject: (title: string) => `Balík schválený: „${title}"`,
      headerTitle: "Balík schválený!",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (title: string) =>
        `Gratulujeme! Váš balík <strong>„${title}"</strong> bol schválený naším administratívnym tímom a je teraz dostupný na Frafol.`,
      note: "Váš balík je teraz viditeľný pre klientov a pripravený prijímať rezervácie.",
      ctaBtn: "Zobraziť váš balík",
      helpText: (supportEmail: string) =>
        `Ak máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    packageDeclined: {
      subject: (title: string) => `Balík zamietnutý: „${title}"`,
      headerTitle: "Balík zamietnutý",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: (title: string) =>
        `S ľútosťou vám oznamujeme, že váš balík <strong>„${title}"</strong> bol naším administratívnym tímom zamietnutý.`,
      reasonLabel: "Dôvod:",
      helpText: (supportEmail: string) =>
        `Ak si myslíte, že toto rozhodnutie bolo omylom, alebo máte akékoľvek otázky, kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    eventInvoice: {
      subject: (orderId: string) => `Faktúra – Objednávka ${orderId} | Frafol`,
      headerTitle: "Potvrdenie platby a faktúra",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: "Vaša platba bola úspešne spracovaná. Nižšie nájdete svoju faktúru.",
      labels: {
        invoiceOrderId: "Číslo faktúry / objednávky",
        transactionId: "ID transakcie",
        paymentDate: "Dátum platby",
        paymentMethod: "Spôsob platby",
        billTo: "Fakturačné údaje",
        name: "Meno",
        address: "Adresa",
        company: "Spoločnosť",
        ico: "IČO",
        dic: "DIČ",
        icDph: "IČ DPH",
        orderDetails: "Detaily objednávky",
        orderType: "Typ objednávky",
        serviceType: "Typ služby",
        serviceProvider: "Poskytovateľ služby",
        eventDate: "Dátum podujatia",
        location: "Miesto",
        priceBreakdown: "Rozpis ceny",
        basePrice: "Základná cena",
        serviceFee: "Servisný poplatok",
        vat: "DPH",
        couponDiscount: "Zľava kupónu",
        totalPaid: "Celková zaplatená suma",
      },
      directBooking: "Priama rezervácia",
      customBooking: (serviceType: string) => `Individuálna rezervácia – ${serviceType}`,
      invoiceNote: "Tento e-mail slúži ako vaša oficiálna faktúra. Uschovajte si ho pre svoje záznamy.",
      questions: (supportEmail: string) =>
        `Máte otázky? Kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    workshopInvoice: {
      subject: (title: string) => `Faktúra za workshop – ${title} | Frafol`,
      headerTitle: "Faktúra za registráciu na workshop",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: "Vaša registrácia na workshop je potvrdená. Tu je vaša faktúra.",
      labels: {
        orderId: "Číslo objednávky",
        transactionId: "ID transakcie",
        paymentDate: "Dátum platby",
        billTo: "Fakturačné údaje",
        name: "Meno",
        address: "Adresa",
        company: "Spoločnosť",
        ico: "IČO",
        dic: "DIČ",
        icDph: "IČ DPH",
        workshopDetails: "Detaily workshopu",
        workshop: "Workshop",
        instructor: "Lektor",
        dateAndTime: "Dátum a čas",
        format: "Formát",
        locationOrLink: "Miesto / odkaz",
        priceBreakdown: "Rozpis ceny",
        basePrice: "Základná cena",
        vat: "DPH",
        totalPaid: "Celková zaplatená suma",
      },
      inPerson: "Osobne",
      invoiceNote: "Tento e-mail slúži ako vaša oficiálna faktúra. Uschovajte si ho pre svoje záznamy.",
      questions: (supportEmail: string) =>
        `Máte otázky? Kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    gearInvoice: {
      subject: (count: number) => `Faktúra z trhoviska – ${count} položk${count !== 1 ? "y" : "a"} | Frafol`,
      headerTitle: "Faktúra za objednávku z trhoviska",
      greeting: (name: string) => `Dobrý deň <strong>${name}</strong>,`,
      intro: "Váš nákup na trhovisku je potvrdený. Tu je vaša faktúra.",
      labels: {
        transactionId: "ID transakcie",
        paymentDate: "Dátum platby",
        itemsPurchased: "Zakúpené položky",
        shipTo: "Doručovacia adresa",
        name: "Meno",
        address: "Adresa",
        company: "Spoločnosť",
        ico: "IČO",
        dic: "DIČ",
        icDph: "IČ DPH",
        itemsOrdered: "Objednané položky",
        item: "Položka",
        base: "Základ",
        vat: "DPH",
        shipping: "Doprava",
        total: "Spolu",
        order: "Objednávka",
        condition: "Stav",
        itemsSubtotal: "Medzisúčet položiek",
        totalShipping: "Doprava spolu",
        totalPaid: "Celková zaplatená suma",
      },
      invoiceNote: "Tento e-mail slúži ako vaša oficiálna faktúra. Uschovajte si ho pre svoje záznamy.",
      questions: (supportEmail: string) =>
        `Máte otázky? Kontaktujte nás na <a href="mailto:${supportEmail}" style="color:inherit;text-decoration:none;">${supportEmail}</a>.`,
      closing: "S pozdravom,",
    },
    common: {
      teamSignature: "Tím Frafol",
      policiesIntro: "Prečítajte si prosím naše zásady:",
      termsMarketplace: "Obchodné podmienky (Trhovisko)",
      termsConceptual: "Obchodné podmienky (Koncepčné)",
      gdprPolicy: "GDPR a Zásady ochrany osobných údajov",
      footerRights: (year: number) => `© ${year} Frafol. Všetky práva vyhradené.`,
    },
  },
} as const;

export const getEmailStrings = () => emailStrings[getEmailLang()];