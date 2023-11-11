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

  if (!recipients || !validateEmail(recipients)) {
    alert("Please enter a valid recipient email.");
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
    .then((response) => response.json())
    .then((result) => {
      if (result.message === "Email sent successfully") {
        alert("Email sent successfully!");
        load_mailbox("sent");
      } else {
        const errorMessage =
          result.error || "An error occurred. Please try again.";
        alert(`Error sending email: ${errorMessage}`);
      }
    });
}

function validateEmail(email) {
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return regex.test(email);
}

function display_emails(emails, mailbox) {
  const emailContainer = document.querySelector("#emails-view");

  emails.forEach((email) => {
    const emailDiv = document.createElement("div");
    emailDiv.className = "email";
    emailDiv.style.border = "1px solid black";
    emailDiv.style.padding = "10px";
    emailDiv.style.marginBottom = "10px";
    emailDiv.style.background = email.read ? "gray" : "white";

    emailDiv.innerHTML = `
          <b>From:</b> ${email.sender} <br>
          <b>Subject:</b> ${email.subject} <br>
          <b>Timestamp:</b> ${email.timestamp}`;

    emailDiv.addEventListener("click", () => load_email(email.id));

    emailContainer.appendChild(emailDiv);
  });
}

// ... [Rest of the code remains largely unchanged] ...

function load_email(email_id) {
  // Hide other views
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "none";

  const emailView = document.querySelector("#email-view");
  emailView.style.display = "block";
  emailView.innerHTML = ""; // Clear previous content

  // Fetch email content
  fetch(`/emails/${email_id}`)
    .then((response) => response.json())
    .then((email) => display_email(email))
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
  replyButton.addEventListener("click", () => reply_email(email));
  emailView.appendChild(replyButton);

  // Only show the Archive/Unarchive button for emails in the 'inbox' and 'archive' mailboxes
  if (mailbox === "inbox" || mailbox === "archive") {
    const archiveButton = document.createElement("button");
    if (email.archived) {
      archiveButton.textContent = "Unarchive";
      archiveButton.addEventListener("click", () =>
        toggle_archive(email.id, false)
      );
    } else {
      archiveButton.textContent = "Archive";
      archiveButton.addEventListener("click", () =>
        toggle_archive(email.id, true)
      );
    }
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
      load_mailbox("inbox");
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
