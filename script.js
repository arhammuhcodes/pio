
document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const menuToggle = document.getElementById('menuToggle');
  const navMenu = document.getElementById('navMenu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      menuToggle.classList.toggle('active');
    });

    // Close menu when clicking any nav link
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        menuToggle.classList.remove('active');
      });
    });
  }

  // 2. Header shadow on scroll
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // 3. FAQ Accordion
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const parentItem = header.parentElement;
      const content = header.nextElementSibling;
      const isOpen = parentItem.classList.contains('active');

      // Close all other accordion items
      document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.remove('active');
        item.querySelector('.accordion-content').style.maxHeight = null;
      });

      if (!isOpen) {
        parentItem.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });

  // Open the first FAQ item by default
  const firstFaq = document.querySelector('.accordion-item');
  if (firstFaq) {
    firstFaq.classList.add('active');
    const firstContent = firstFaq.querySelector('.accordion-content');
    if (firstContent) {
      firstContent.style.maxHeight = firstContent.scrollHeight + 'px';
    }
  }

  // Close modals on clicking outside
  window.addEventListener('click', (e) => {
    const trialModal = document.getElementById('trialModal');
    const successModal = document.getElementById('successModal');
    if (e.target === trialModal) {
      closeTrialModal();
    }
    if (e.target === successModal) {
      closeSuccessModal();
    }
  });

  // Close modals on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTrialModal();
      closeSuccessModal();
    }
  });
});

/* Modal Controls */
function openTrialModal() {
  const modal = document.getElementById('trialModal');
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeTrialModal() {
  const modal = document.getElementById('trialModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function openSuccessModal(message, whatsappUrl) {
  const modal = document.getElementById('successModal');
  const msgElem = document.getElementById('successMessage');
  const waBtn = document.getElementById('directWhatsappBtn');

  if (msgElem && message) {
    msgElem.textContent = message;
  }
  if (waBtn && whatsappUrl) {
    waBtn.href = whatsappUrl;
  }
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeSuccessModal() {
  const modal = document.getElementById('successModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/* Quick course selection from course cards or footer */
function selectCourse(courseName) {
  const select = document.getElementById('courseChoice');
  const modalSelect = document.getElementById('mCourseChoice');
  
  if (select) {
    select.value = courseName;
  }
  if (modalSelect) {
    modalSelect.value = courseName;
  }

  // Smooth scroll to contact / registration section
  const contactSection = document.getElementById('contact');
  if (contactSection) {
    contactSection.scrollIntoView({ behavior: 'smooth' });
    const nameInput = document.getElementById('studentName');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 600);
    }
  }
}

/* Pricing plan selection */
function selectPlan(planName) {
  const contactSection = document.getElementById('contact');
  const prefTime = document.getElementById('preferredTime');
  if (prefTime) {
    prefTime.value = `منتخب پلان: ${planName}`;
  }
  if (contactSection) {
    contactSection.scrollIntoView({ behavior: 'smooth' });
    const nameInput = document.getElementById('studentName');
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 600);
    }
  }
}

/* Main Form Submission */
function handleFormSubmit(event) {
  event.preventDefault();

  const name = document.getElementById('studentName').value.trim();
  const age = document.getElementById('studentAge').value.trim();
  const teacher = document.getElementById('genderTeacher').value;
  const whatsapp = document.getElementById('whatsappNumber').value.trim();
  const country = document.getElementById('country').value.trim();
  const course = document.getElementById('courseChoice').value;
  const time = document.getElementById('preferredTime').value.trim() || 'کوئی ترجیحی وقت نہیں';

  const urduMessage = `السلام علیکم نور القرآن اکیڈمی!%0Aمیں آن لائن ۳ دن کی مفت ٹرائل کلاس حاصل کرنا چاہتا ہوں۔ میری معلومات درج ذیل ہیں:%0A%0A*طالب علم کا نام:* ${encodeURIComponent(name)}%0A*عمر:* ${encodeURIComponent(age)} سال%0A*مطلوبہ استاد:* ${encodeURIComponent(teacher)}%0A*کورس:* ${encodeURIComponent(course)}%0A*ملک / شہر:* ${encodeURIComponent(country)}%0A*واٹس ایپ:* ${encodeURIComponent(whatsapp)}%0A*پسندیدہ وقت:* ${encodeURIComponent(time)}%0A%0Aبراہِ کرم مجھے کلاس کا شیڈول فراہم فرمائیں۔ جزاک اللہ!`;

  const academyNumber = '923001234567';
  const whatsappUrl = `https://wa.me/${academyNumber}?text=${urduMessage}`;

  const successText = `محترم ${name}! آپ کی ۳ دن کی مفت کلاس کی درخواست کامیابی سے درج کر لی گئی ہے۔ براہ کرم نیچے دیے گئے بٹن پر کلک کر کے واٹس ایپ پر بھی تصدیق فرما دیں۔`;

  openSuccessModal(successText, whatsappUrl);
  event.target.reset();
}

/* Modal Form Submission */
function handleModalSubmit(event) {
  event.preventDefault();

  const name = document.getElementById('mStudentName').value.trim();
  const age = document.getElementById('mStudentAge').value.trim();
  const teacher = document.getElementById('mGenderTeacher').value;
  const whatsapp = document.getElementById('mWhatsappNumber').value.trim();
  const course = document.getElementById('mCourseChoice').value;

  closeTrialModal();

  const urduMessage = `السلام علیکم نور القرآن اکیڈمی!%0Aمیں ۳ دن کی مفت آزمائشی کلاس حاصل کرنا چاہتا ہوں:%0A%0A*طالب علم کا نام:* ${encodeURIComponent(name)}%0A*عمر:* ${encodeURIComponent(age)} سال%0A*استاد کا انتخاب:* ${encodeURIComponent(teacher)}%0A*کورس:* ${encodeURIComponent(course)}%0A*واٹس ایپ نمبر:* ${encodeURIComponent(whatsapp)}%0A%0Aبراہِ کرم جلد رابطہ فرمائیں۔`;

  const academyNumber = '923001234567';
  const whatsappUrl = `https://wa.me/${academyNumber}?text=${urduMessage}`;

  const successText = `محترم ${name}! آپ کی درخواست موصول ہو گئی ہے۔ آپ براہِ راست واٹس ایپ پر بھی اپنا شیڈول کنفرم کر سکتے ہیں۔`;

  openSuccessModal(successText, whatsappUrl);
  event.target.reset();
}
