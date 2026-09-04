const servicesGrid = document.querySelector("#services-grid");
const serviceSelect = document.querySelector("#service-select");
const dateSelect = document.querySelector("#date-select");
const timeSelect = document.querySelector("#time-select");
const totalPrice = document.querySelector("#total-price");
const bookingForm = document.querySelector("#booking-form");
const appointmentsList = document.querySelector("#appointments-list");

let services = [];
let appointments = JSON.parse(localStorage.getItem("podoturnos-reservas")) || [];

const formatCurrency = (value) => `$ ${value.toLocaleString("es-AR")}`;

const formatDate = (dateString) => new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric"
}).format(new Date(`${dateString}T12:00:00`));

const getNextWeekdays = (amount) => {
  const dates = [];
  const currentDate = new Date();
  currentDate.setHours(12, 0, 0, 0);

  for (let index = 1; dates.length < amount; index += 1) {
    const candidate = new Date(currentDate);
    candidate.setDate(currentDate.getDate() + index);
    if (candidate.getDay() !== 0 && candidate.getDay() !== 6) dates.push(candidate);
  }

  return dates;
};

const loadServices = async () => {
  try {
    const response = await fetch("data/servicios.json");
    if (!response.ok) throw new Error("No se pudo cargar la informacion.");
    services = await response.json();
    renderServices();
    populateServiceSelect();
  } catch {
    servicesGrid.innerHTML = "<p class=\"empty-state\">No se pudieron cargar los tratamientos. Revisa la conexion del proyecto.</p>";
  }
};

const renderServices = () => {
  servicesGrid.innerHTML = services.map((service) => `
    <article class="service-card">
      <span class="service-number">${service.number}</span>
      <div class="service-icon" aria-hidden="true">${service.icon}</div>
      <h3>${service.name}</h3>
      <p>${service.description}</p>
      <div class="service-meta"><span>${service.duration} min</span><strong>${formatCurrency(service.price)}</strong></div>
    </article>
  `).join("");
};

const populateServiceSelect = () => {
  serviceSelect.innerHTML += services.map((service) => `<option value="${service.id}">${service.name} - ${formatCurrency(service.price)}</option>`).join("");
};

const updatePrice = () => {
  const selectedService = services.find((service) => service.id === serviceSelect.value);
  totalPrice.textContent = selectedService ? formatCurrency(selectedService.price) : "$ 0";
};

const updateAvailableTimes = () => {
  const selectedDate = dateSelect.value;
  const selectedService = services.find((service) => service.id === serviceSelect.value);
  if (!selectedDate) {
    timeSelect.innerHTML = "<option value=\"\">Selecciona una fecha primero</option>";
    return;
  }

  const times = ["09:00", "10:30", "12:00", "15:00", "16:30", "18:00"];
  const reservedTimes = appointments.filter((appointment) => appointment.date === selectedDate).map((appointment) => appointment.time);
  const availableTimes = times.filter((time) => !reservedTimes.includes(time));
  timeSelect.innerHTML = availableTimes.length
    ? `<option value="">Selecciona un horario</option>${availableTimes.map((time) => `<option value="${time}">${time} hs · ${selectedService ? selectedService.duration : 60} min</option>`).join("")}`
    : "<option value=\"\">No quedan horarios disponibles</option>";
};

const configureDates = () => {
  const availableDates = getNextWeekdays(10);
  dateSelect.min = availableDates[0].toISOString().split("T")[0];
  dateSelect.max = availableDates[availableDates.length - 1].toISOString().split("T")[0];
};

const renderAppointments = () => {
  if (!appointments.length) {
    appointmentsList.innerHTML = "<div class=\"empty-state\">Todavia no tenes turnos reservados. Tu proxima visita puede empezar aca.</div>";
    return;
  }

  appointmentsList.innerHTML = appointments.map((appointment) => `
    <article class="appointment-item">
      <div class="appointment-date">${formatDate(appointment.date)}</div>
      <div><strong>${appointment.serviceName}</strong><small>${appointment.patientName} · ${appointment.time} hs · ${appointment.paymentMethod}</small></div>
      <span class="appointment-status">Confirmado</span>
      <button class="cancel-button" data-id="${appointment.id}" type="button">Cancelar</button>
    </article>
  `).join("");
};

const showSuccess = (appointment) => {
  Swal.fire({
    title: "Turno confirmado",
    html: `<strong>${appointment.serviceName}</strong><br>${formatDate(appointment.date)} a las ${appointment.time} hs<br><small>Pago simulado aprobado por ${appointment.paymentMethod}.</small>`,
    icon: "success",
    confirmButtonText: "Ver mis turnos",
    confirmButtonColor: "#173b44"
  }).then(() => document.querySelector("#mis-turnos").scrollIntoView({ behavior: "smooth" }));
};

serviceSelect.addEventListener("change", () => { updatePrice(); updateAvailableTimes(); });
dateSelect.addEventListener("change", updateAvailableTimes);

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedService = services.find((service) => service.id === serviceSelect.value);
  const appointment = {
    id: crypto.randomUUID(),
    serviceName: selectedService.name,
    date: dateSelect.value,
    time: timeSelect.value,
    patientName: document.querySelector("#patient-name").value.trim(),
    paymentMethod: document.querySelector("#payment-method").value,
    price: selectedService.price
  };

  appointments.push(appointment);
  localStorage.setItem("podoturnos-reservas", JSON.stringify(appointments));
  renderAppointments();
  showSuccess(appointment);
  bookingForm.reset();
  totalPrice.textContent = "$ 0";
  timeSelect.innerHTML = "<option value=\"\">Selecciona una fecha primero</option>";
});

appointmentsList.addEventListener("click", (event) => {
  if (!event.target.matches(".cancel-button")) return;
  const appointment = appointments.find((item) => item.id === event.target.dataset.id);
  Swal.fire({ title: "Cancelar turno", text: `Se cancelara el turno de ${appointment.serviceName}.`, icon: "warning", showCancelButton: true, confirmButtonText: "Si, cancelar", cancelButtonText: "Volver", confirmButtonColor: "#e9866d" }).then((result) => {
    if (!result.isConfirmed) return;
    appointments = appointments.filter((item) => item.id !== appointment.id);
    localStorage.setItem("podoturnos-reservas", JSON.stringify(appointments));
    renderAppointments();
    Swal.fire({ title: "Turno cancelado", icon: "success", confirmButtonColor: "#173b44" });
  });
});

configureDates();
renderAppointments();
loadServices();
