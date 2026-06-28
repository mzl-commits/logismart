package com.tecsup.logismart_movil.utils

import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

object DateUtils {

    private val locale = Locale("es", "PE")

    private val dateFormatter: DateTimeFormatter =
        DateTimeFormatter.ofPattern("dd/MM/yyyy", locale)

    private val dateTimeFormatter: DateTimeFormatter =
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", locale)

    private val fullDateTimeFormatter: DateTimeFormatter =
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm z", locale)

    fun formatDate(date: LocalDate): String {
        return date.format(dateFormatter)
    }

    fun formatDateTime(dateTime: LocalDateTime): String {
        return dateTime.format(dateTimeFormatter)
    }

    fun formatToday(zoneId: ZoneId = ZoneId.systemDefault()): String {
        return LocalDate.now(zoneId).format(dateFormatter)
    }

    fun formatInstant(
        instant: Instant,
        zoneId: ZoneId = ZoneId.systemDefault()
    ): String {
        return instant.atZone(zoneId).format(dateTimeFormatter)
    }

    fun formatInstantWithZone(
        instant: Instant,
        zoneId: ZoneId = ZoneId.systemDefault()
    ): String {
        return instant.atZone(zoneId).format(fullDateTimeFormatter)
    }

    fun formatZonedDateTime(
        zonedDateTime: ZonedDateTime,
        targetZone: ZoneId = ZoneId.systemDefault()
    ): String {
        return zonedDateTime.withZoneSameInstant(targetZone).format(fullDateTimeFormatter)
    }

    fun limaZone(): ZoneId {
        return ZoneId.of("America/Lima")
    }
}
