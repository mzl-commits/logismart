package com.tecsup.logismart_movil.di

import android.content.Context
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.tecsup.logismart_movil.data.local.SessionManager
import com.tecsup.logismart_movil.data.local.UserPreferences
import com.tecsup.logismart_movil.data.network.LogiSmartApiService
import com.tecsup.logismart_movil.data.remote.LogiSmartApi
import com.tecsup.logismart_movil.data.remote.LogisticsApiService
import com.tecsup.logismart_movil.data.remote.ShelvesApi
import com.tecsup.logismart_movil.data.repository.AuthRepository
import com.tecsup.logismart_movil.data.repository.CarRepositoryImpl
import com.tecsup.logismart_movil.data.repository.DashboardRepository
import com.tecsup.logismart_movil.data.repository.LogisticsRepository
import com.tecsup.logismart_movil.domain.repository.CarRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    const val DEFAULT_BASE_URL = "https://logistica.promube.com/"

    @Provides
    @Singleton
    fun provideGson(): Gson = GsonBuilder().create()

    @Provides
    @Singleton
    fun provideSessionManager(@ApplicationContext context: Context): SessionManager =
        SessionManager(context)

    @Provides
    @Singleton
    fun provideUserPreferences(@ApplicationContext context: Context): UserPreferences =
        UserPreferences(context)

    @Provides
    @Singleton
    fun provideOkHttpClient(
        sessionManager: SessionManager,
        userPreferences: UserPreferences
    ): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        return OkHttpClient.Builder()
            // 1. Authentication header injector (Bearer JWT) based on Wash's SessionManager
            .addInterceptor { chain ->
                val token = runBlocking { sessionManager.session.first()?.token }
                val request = chain.request().newBuilder().apply {
                    if (!token.isNullOrBlank()) {
                        header("Authorization", "Bearer $token")
                    }
                }.build()
                chain.proceed(request)
            }
            // 3. Automated session cleanup on 401 Unauthorized responses
            .addInterceptor { chain ->
                val response = chain.proceed(chain.request())
                val isLogin = chain.request().url.encodedPath.endsWith("/api/mobile/login/")
                if (response.code == 401 && !isLogin) {
                    runBlocking { sessionManager.clear() }
                }
                response
            }
            .addInterceptor(loggingInterceptor)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .writeTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient, gson: Gson): Retrofit {
        return Retrofit.Builder()
            .baseUrl(DEFAULT_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }

    @Provides
    @Singleton
    fun provideLogiSmartApiService(retrofit: Retrofit): LogiSmartApiService {
        return retrofit.create(LogiSmartApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideLogiSmartApi(retrofit: Retrofit): LogiSmartApi {
        return retrofit.create(LogiSmartApi::class.java)
    }

    @Provides
    @Singleton
    fun provideLogisticsApiService(retrofit: Retrofit): LogisticsApiService {
        return retrofit.create(LogisticsApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideShelvesApi(retrofit: Retrofit): ShelvesApi {
        return retrofit.create(ShelvesApi::class.java)
    }

    @Provides
    @Singleton
    fun provideAuthRepository(api: LogiSmartApi, sessionManager: SessionManager): AuthRepository {
        return AuthRepository(api, sessionManager)
    }

    @Provides
    @Singleton
    fun provideDashboardRepository(api: LogiSmartApi): DashboardRepository {
        return DashboardRepository(api)
    }

    @Provides
    @Singleton
    fun provideLogisticsRepository(api: LogisticsApiService): LogisticsRepository {
        return LogisticsRepository(api)
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    @Singleton
    abstract fun bindCarRepository(
        carRepositoryImpl: CarRepositoryImpl
    ): CarRepository
}
