document.addEventListener("DOMContentLoaded", function () {
  // Initialize views
  initViews();

  // Event listeners for the main menu buttons
  document
    .querySelector("#inbox")
    .addEventListener("click", () => load_mailbox("inbox"));
  document
    .querySelector("#sent")
    .addEventListener("click", () => load_mailbox("sent"));
  document
    .querySelector("#archived")
    .addEventListener("click", () => load_mailbox("archive"));
  document.querySelector("#compose").addEventListener("click", compose_email);

  // Event listener for sending email
  document
    .querySelector("#compose-form")
    .addEventListener("submit", send_email);

  // Load the inbox by default
  load_mailbox("inbox");
});

function initViews() {
  // Hide all views except the mailbox view
  document.querySelector("#emails-view").style.display = "block";
  document.querySelector("#compose-view").style.display = "none";
  document.querySelector("#email-view").style.display = "none";
}

function compose_email() {
  // Display the compose view
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "block";
  document.querySelector("#email-view").style.display = "none";

  // Clear the form fields
  document.querySelector("#compose-recipients").value = "";
  document.querySelector("#compose-subject").value = "";
  document.querySelector("#compose-body").value = "";
}

function load_mailbox(mailbox) {
  // Clear previous content
  document.querySelector("#emails-view").innerHTML = "";

  // Adjust view visibility
  initViews();

  // Display mailbox name
  document.querySelector("#emails-view").innerHTML = `<h3>${
    mailbox.charAt(0).toUpperCase() + mailbox.slice(1)
  }</h3>`;

  fetch(`/emails/${mailbox}`)
    .then((response) => response.json())
    .then((emails) => display_emails(emails, mailbox))
    .catch((error) => console.error("Error loading emails:", error));
}

function send_email(event) {
  event.preventDefault();

  const recipients = document.querySelector("#compose-recipients").value;
  const subject = document.querySelector("#compose-subject").value;
  const body = document.querySelector("#compose-body").value;

  if (!recipients || !validateEmails(recipients)) {
    alert("Please enter valid recipient emails.");
    return;
  }

  if (!subject || !body) {
    alert("Please complete all fields.");
    return;
  }

  fetch("/emails", {
    method: "POST",
    body: JSON.stringify({ recipients, subject, body }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((result) => {
      if (result.message === "Email sent successfully") {
        alert("Email sent successfully!");
        load_mailbox("sent");
      } else {
        const errorMessage = result.error || "An unexpected error occurred.";
        alert(`Error sending email: ${errorMessage}`);
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      alert("An error occurred. Please try again.");
    });
}

function validateEmails(emails) {
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return emails.split(",").every((email) => regex.test(email.trim()));
}

function display_emails(emails, mailbox) {
  const emailContainer = document.querySelector("#emails-view");

  emails.forEach((email) => {
    // Create a row for each email
    const emailRow = document.createElement("div");
    emailRow.className = "row email mb-2 border-bottom";

    // Create columns for sender, subject, and date
    const senderCol = document.createElement("div");
    senderCol.className = "col-md-4 col-sm-12";
    senderCol.textContent = email.sender;

    const subjectCol = document.createElement("div");
    subjectCol.className = "col-md-4 col-sm-12 text-center";
    subjectCol.textContent = email.subject;

    const dateCol = document.createElement("div");
    dateCol.className = "col-md-4 col-sm-12 text-right";
    dateCol.textContent = email.timestamp;

    // Append columns to the row
    emailRow.appendChild(senderCol);
    emailRow.appendChild(subjectCol);
    emailRow.appendChild(dateCol);

    // Add event listener for row click
    emailRow.addEventListener("click", () => load_email(email.id, mailbox));

    // Append the row to the container
    emailContainer.appendChild(emailRow);
  });
}

function load_email(email_id, mailbox) {
  // Hide other views
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "none";

  const emailView = document.querySelector("#email-view");
  emailView.style.display = "block";
  emailView.innerHTML = ""; // Clear previous content

  // Fetch email content
  fetch(`/emails/${email_id}`)
    .then((response) => response.json())
    .then((email) => display_email(email, mailbox))
    .catch((error) => console.error("Error loading email:", error));

  // Mark the email as read
  mark_as_read(email_id);
}

function display_email(email, mailbox) {
  const emailView = document.querySelector("#email-view");

  // Sender information
  const senderDiv = document.createElement("div");
  senderDiv.innerHTML = `<b>Sender:</b> ${email.sender}`;
  emailView.appendChild(senderDiv);

  // Recipients information
  const recipientsDiv = document.createElement("div");
  recipientsDiv.innerHTML = `<b>Recipients:</b> ${email.recipients.join(", ")}`;
  emailView.appendChild(recipientsDiv);

  // Subject information
  const subjectDiv = document.createElement("div");
  subjectDiv.innerHTML = `<b>Subject:</b> ${email.subject}`;
  emailView.appendChild(subjectDiv);

  // Timestamp information
  const timestampDiv = document.createElement("div");
  timestampDiv.innerHTML = `<b>Timestamp:</b> ${email.timestamp}`;
  emailView.appendChild(timestampDiv);

  // Body of the email
  const bodyDiv = document.createElement("div");
  bodyDiv.innerHTML = `<p>${email.body}</p>`;
  emailView.appendChild(bodyDiv);

  const replyButton = document.createElement("button");
  replyButton.textContent = "Reply";
  replyButton.className = "btn btn-primary"; // Add class for styling
  replyButton.addEventListener("click", () => reply_email(email));
  emailView.appendChild(replyButton);

  // Only show the Archive/Unarchive button for emails in the 'inbox' and 'archive' mailboxes
  if (mailbox === "inbox" || mailbox === "archive") {
    const archiveButton = document.createElement("button");
    archiveButton.textContent = mailbox === "inbox" ? "Archive" : "Unarchive";
    archiveButton.className = "btn btn-primary"; // Add class for styling
    archiveButton.addEventListener("click", () =>
      toggle_archive(email.id, mailbox !== "inbox")
    );
    emailView.appendChild(archiveButton);
  }
}

function mark_as_read(email_id) {
  fetch(`/emails/${email_id}`, {
    method: "PUT",
    body: JSON.stringify({
      read: true,
    }),
  });
}
function mark_as_unread(email_id) {
  fetch(`/emails/${email_id}`, {
    method: "PUT",
    body: JSON.stringify({
      read: false,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      load_mailbox("inbox");
    })
    .catch((error) => console.error("Error updating read status:", error));
}

function toggle_archive(email_id, archiveStatus) {
  fetch(`/emails/${email_id}`, {
    method: "PUT",
    body: JSON.stringify({
      archived: archiveStatus,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      // Reload the appropriate mailbox after updating the archive status
      if (archiveStatus) {
        load_mailbox("inbox"); // If archiving, reload inbox
      } else {
        load_mailbox("archive"); // If unarchiving, reload archive
      }
    })
    .catch((error) => console.error("Error updating archive status:", error));
}

function reply_email(email) {
  // Activate the composition view
  compose_email();

  // Pre-fill the composition form
  document.querySelector("#compose-recipients").value = email.sender;

  // Check for 'Re:' prefix in the subject
  const subjectPrefix = email.subject.startsWith("Re: ") ? "" : "Re: ";
  document.querySelector("#compose-subject").value =
    subjectPrefix + email.subject;

  const replyBodyPrefix = `On ${email.timestamp} ${email.sender} wrote:\n${email.body}\n\n`;
  document.querySelector("#compose-body").value = replyBodyPrefix;
}
