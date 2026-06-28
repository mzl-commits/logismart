package com.tecsup.logismart_movil.utils

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

object DateUtils {

    private val dateFormatter: DateTimeFormatter =
        DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale("es", "PE"))

    private val dateTimeFormatter: DateTimeFormatter =
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale("es", "PE"))

    fun formatDate(date: LocalDate): String {
        return date.format(dateFormatter)
    }

    fun formatDateTime(dateTime: LocalDateTime): String {
        return dateTime.format(dateTimeFormatter)
    }

    fun formatToday(): String {
        return LocalDate.now().format(dateFormatter)
    }
}
