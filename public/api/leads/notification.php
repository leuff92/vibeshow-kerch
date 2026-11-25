<?php
declare(strict_types=1);

function send_lead_notification(array $lead, array $env): void
{
    $recipientOverride = getenv('LEAD_MAIL_TO');
    $recipient = trim($recipientOverride === false ? ($env['LEAD_MAIL_TO'] ?? '') : $recipientOverride);
    if ($recipient === '') {
        return;
    }

    $sender = trim((string) (getenv('LEAD_MAIL_FROM') ?: ($env['LEAD_MAIL_FROM'] ?? '')));
    $reference = $lead['id'];
    if (!filter_var($recipient, FILTER_VALIDATE_EMAIL) || ($sender !== '' && !valid_envelope_sender($sender))) {
        error_log('Lead email skipped due to invalid mail configuration. Lead: ' . $reference);
        return;
    }

    $subject = '=?UTF-8?B?' . base64_encode('Новая заявка с сайта Вайб Шоу') . '?=';
    $details = [
        'Программа' => $lead['programName'],
        'Имя организатора' => $lead['parentName'],
        'Телефон' => $lead['parentPhone'],
        'Дата' => $lead['date'],
        'Время или сеанс' => $lead['time'],
        'Количество детей' => $lead['childrenCount'],
        'Комментарий' => $lead['comment'],
    ];
    $lines = ['Номер заявки: ' . $reference, ''];
    foreach ($details as $label => $value) {
        if ($value !== '' && $value !== null) {
            $lines[] = $label . ': ' . $value;
        }
    }
    $body = chunk_split(base64_encode(implode("\r\n", $lines)), 76, "\r\n");
    $headers = [
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => 'base64',
    ];
    $parameters = '';
    if ($sender !== '') {
        $headers['From'] = $sender;
        $parameters = '-f' . $sender;
    }

    try {
        if (@mail($recipient, $subject, $body, $headers, $parameters)) {
            return;
        }
    } catch (Throwable $error) {
        error_log('Lead email transport unavailable (' . get_class($error) . '). Lead: ' . $reference);
        return;
    }

    error_log('Lead email was not accepted by the mail server. Lead: ' . $reference);
}

function valid_envelope_sender(string $address): bool
{
    return filter_var($address, FILTER_VALIDATE_EMAIL) !== false
        && preg_match('/\A[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\z/', $address) === 1;
}
